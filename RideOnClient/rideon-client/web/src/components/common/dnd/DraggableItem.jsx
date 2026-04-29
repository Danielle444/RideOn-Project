import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

export default function DraggableItem(props) {
  const {
    id,
    data,
    disabled,
    children,
    className,
    draggingClassName,
    disabledClassName,
  } = props;

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: id,
      data: data,
      disabled: disabled,
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={[
        className || "",
        isDragging ? draggingClassName || "" : "",
        disabled ? disabledClassName || "" : "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}