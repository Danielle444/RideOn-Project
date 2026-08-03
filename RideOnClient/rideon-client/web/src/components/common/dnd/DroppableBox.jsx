import { useDroppable } from "@dnd-kit/core";
import { getActiveOverClassName } from "./DroppableBox.utils";

export default function DroppableBox(props) {
  const {
    id,
    data,
    disabled,
    children,
    className,
    overClassName,
    blocked,
    blockedOverClassName,
  } = props;

  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: data,
    disabled: disabled,
  });

  const activeOverClass = getActiveOverClassName({
    isOver: isOver,
    disabled: disabled,
    blocked: blocked,
    overClassName: overClassName,
    blockedOverClassName: blockedOverClassName,
  });

  return (
    <div
      ref={setNodeRef}
      className={[className || "", activeOverClass].join(" ")}
    >
      {children}
    </div>
  );
}