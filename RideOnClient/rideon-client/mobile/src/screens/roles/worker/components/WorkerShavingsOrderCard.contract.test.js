import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// WorkerShavingsOrderCard imports react-native/@expo/vector-icons, not safe to import
// under plain vitest (same reason as every other *.contract.test.js file in this
// codebase - see WorkerHomeScreen.contract.test.js). This pins the RanchWorker shavings
// cancellation-lifecycle behavior (state precedence, action gating, label text) against
// the component's source text instead of rendering it.

var SOURCE_PATH = path.resolve(__dirname, "WorkerShavingsOrderCard.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

// Bounded by the next function declaration.
function extractFunctionBody(source, fromMarker, toMarker) {
  var from = source.indexOf(fromMarker);
  expect(from).toBeGreaterThan(-1);

  var rest = source.substring(from);
  var to = rest.indexOf(toMarker);
  expect(to).toBeGreaterThan(-1);

  return rest.substring(0, to);
}

function deriveStateBody(source) {
  return extractFunctionBody(source, "function deriveState(props) {", "function getStatusLabel");
}

function getStatusLabelBody(source) {
  return extractFunctionBody(
    source,
    "function getStatusLabel(state) {",
    "export default function WorkerShavingsOrderCard",
  );
}

describe("WorkerShavingsOrderCard - cancellation lifecycle state precedence", function () {
  it("checks isCancelled first, ahead of hasPendingCancellation and the delivered check", function () {
    var body = deriveStateBody(readSource());

    var cancelledAt = body.indexOf('props.isCancelled === true');
    var pendingCancellationAt = body.indexOf('props.hasPendingCancellation === true');
    var deliveredAt = body.indexOf('props.deliveryStatus === "Delivered"');

    expect(cancelledAt).toBeGreaterThan(-1);
    expect(pendingCancellationAt).toBeGreaterThan(-1);
    expect(deliveredAt).toBeGreaterThan(-1);

    // Cancelled wins over everything, including Delivered - an order that was delivered
    // before being cancelled must still render as Cancelled, not Delivered.
    expect(cancelledAt).toBeLessThan(pendingCancellationAt);
    expect(cancelledAt).toBeLessThan(deliveredAt);
    // PendingCancellation also wins over the normal Pending/Seen/Delivered derivation.
    expect(pendingCancellationAt).toBeLessThan(deliveredAt);
  });

  it("returns the literal 'Cancelled' state when isCancelled is true", function () {
    var body = deriveStateBody(readSource());

    expect(body).toContain(
      'if (props.isCancelled === true) {\n    return "Cancelled";\n  }',
    );
  });

  it("returns the literal 'PendingCancellation' state when hasPendingCancellation is true", function () {
    var body = deriveStateBody(readSource());

    expect(body).toContain(
      'if (props.hasPendingCancellation === true) {\n    return "PendingCancellation";\n  }',
    );
  });
});

describe("WorkerShavingsOrderCard - cancellation lifecycle labels", function () {
  it("labels PendingCancellation as ממתין לביטול", function () {
    expect(getStatusLabelBody(readSource())).toContain(
      'if (state === "PendingCancellation") return "ממתין לביטול";',
    );
  });

  it("labels Cancelled as בוטל", function () {
    expect(getStatusLabelBody(readSource())).toContain(
      'if (state === "Cancelled") return "בוטל";',
    );
  });
});

describe("WorkerShavingsOrderCard - locked actions for cancellation states", function () {
  // The claim/deliver/photo blocks are each gated on a state string equality
  // ("Pending" / "Seen" / "Delivered"), never on the raw deliveryStatus or a boolean flag
  // alone - so a PendingCancellation/Cancelled order structurally cannot reach any of them,
  // since deriveState() never returns those three strings once isCancelled or
  // hasPendingCancellation is true (proven by the precedence test above).

  it("gates the claim button strictly on state === 'Pending'", function () {
    var source = readSource();

    expect(source).toContain('{state === "Pending" && props.isUnclaimed && props.onClaim && (');
  });

  it("gates the deliver-photo button strictly on state === 'Seen'", function () {
    var source = readSource();

    expect(source).toContain('{state === "Seen" && props.isMyOrder && (');
  });

  it("gates the no-photo mark-delivered fallback inside the Seen+mine block only", function () {
    var source = readSource();

    var seenBlockStart = source.indexOf('{state === "Seen" && props.isMyOrder && (');
    var pendingCancellationBlockStart = source.indexOf('{state === "PendingCancellation" &&');

    expect(seenBlockStart).toBeGreaterThan(-1);
    expect(pendingCancellationBlockStart).toBeGreaterThan(-1);

    var seenBlock = source.substring(seenBlockStart, pendingCancellationBlockStart);

    expect(seenBlock).toContain("onMarkDelivered");
  });

  it("renders no onClaim/onCapturePhoto/onMarkDelivered handler inside the PendingCancellation or Cancelled blocks", function () {
    var source = readSource();

    var pendingCancellationBlockStart = source.indexOf('{state === "PendingCancellation" &&');
    expect(pendingCancellationBlockStart).toBeGreaterThan(-1);

    var trailer = source.substring(pendingCancellationBlockStart);

    expect(trailer).not.toContain("onPress={props.onClaim}");
    expect(trailer).not.toContain("onPress={props.onCapturePhoto}");
    expect(trailer).not.toContain("onPress={props.onMarkDelivered}");
  });

  it("preserves claimed worker context in the PendingCancellation block, gated on the worker's name being present", function () {
    var source = readSource();

    expect(source).toContain(
      '{state === "PendingCancellation" &&\n        (props.workerFirstName || props.workerLastName) && (',
    );
    expect(source).toContain("בטיפול: {props.workerFirstName} {props.workerLastName}");
  });

  it("collapses Cancelled by default, the same way Delivered already does", function () {
    var source = readSource();

    expect(source).toContain(
      'const isResolved = isDelivered || state === "Cancelled";',
    );
    expect(source).toContain("const showFullDetails = !isResolved || expanded;");
  });

  it("shows the cancelled terminal confirmation only when expanded, mirroring the Delivered block", function () {
    var source = readSource();

    expect(source).toContain('{state === "Cancelled" && showFullDetails && (');
  });
});

describe("WorkerShavingsOrderCard - delivery destination display", function () {
  // Delivery destination replaces the legacy stallNumber/STALL_NUMBER_FALLBACK title
  // entirely — stallNumber is a typed NULL from the proc since the DB-side
  // destination-contract slice, never a real join any more.

  it("imports the shared destination formatter instead of duplicating the logic locally", function () {
    var source = readSource();

    expect(source).toContain(
      'import { getDeliveryDestinationDisplay } from "../../../../../../shared/shavings/shavingsDestination.utils";',
    );
  });

  it("no longer hardcodes a stallNumber-based title fallback", function () {
    var source = readSource();

    expect(source).not.toContain("STALL_NUMBER_FALLBACK");
    expect(source).not.toContain("props.stallNumber ||");
  });

  it("derives the destination model from the full props object once", function () {
    var source = readSource();

    expect(source).toContain(
      "const destination = getDeliveryDestinationDisplay(props);",
    );
  });

  it("renders the fully-unassigned text in place of the title, not a separate detail row", function () {
    var source = readSource();

    expect(source).toContain("{destination.emptyText ? (");
    expect(source).toContain("{destination.emptyText}");
  });

  it("renders one line per resolved compound when destinations are known", function () {
    var source = readSource();

    expect(source).toContain("{destination.lines.map(function (line, index) {");
  });

  it("renders the partial-assignment warning only when present, alongside the resolved lines", function () {
    var source = readSource();

    expect(source).toContain("{destination.warningText && (");
    expect(source).toContain("{destination.warningText}");
  });
});
