import { useDroppable } from "@dnd-kit/core";

export default function DroppableBox(props) {
  const { id, data, disabled, children, className, overClassName } = props;

  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: data,
    disabled: disabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={[
        className || "",
        isOver && !disabled ? overClassName || "" : "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}