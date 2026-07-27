// CAP-9: proc text embeds date ranges as "DD/MM/YYYY - DD/MM/YYYY". Inside an
// RTL paragraph the two date runs get ordered right-to-left, so the later date
// shows first. Wrapping only the matched range in an isolated LTR span keeps the
// range in reading order (earlier date first) without disturbing the Hebrew
// around it.
var DATE_RANGE_PATTERN =
  /\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*[-–]\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g;

export default function DateRangeText(props) {
  var text = props.text;

  if (text === null || text === undefined || text === "") {
    return props.fallback !== undefined ? props.fallback : null;
  }

  var str = String(text);
  var nodes = [];
  var lastIndex = 0;
  var key = 0;
  var match;

  DATE_RANGE_PATTERN.lastIndex = 0;

  while ((match = DATE_RANGE_PATTERN.exec(str)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(str.substring(lastIndex, match.index));
    }

    nodes.push(
      <span key={key} dir="ltr" style={{ unicodeBidi: "isolate" }}>
        {match[0]}
      </span>,
    );

    key += 1;
    lastIndex = match.index + match[0].length;
  }

  if (nodes.length === 0) {
    return str;
  }

  if (lastIndex < str.length) {
    nodes.push(str.substring(lastIndex));
  }

  return <>{nodes}</>;
}
