import logo from "../../../../shared/assets/logo.png";

export default function Sidebar(props) {
  return (
    <aside className="w-[290px] border-l border-[#D9CDC6] bg-white flex flex-col h-full overflow-hidden">
      <div className="pt-8 pb-6 px-6 border-b border-[#EEE3DD] shrink-0">
        <div className="flex flex-col items-center">
          <img src={logo} alt="RideOn" className="h-28 object-contain mb-3" />
        </div>

        <div className="text-center">
          <p className="text-[1.35rem] font-bold text-[#5D4037] leading-8">
            {props.userName}
          </p>

          <p className="mt-2 text-[1.02rem] font-medium text-[#8B6352] leading-7">
            {props.subtitle}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-5">
        {props.items.map(function (item) {
          const Icon = item.icon;
          const isActive = props.activeItemKey === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={function () {
                props.onNavigate(item.key);
              }}
              className={
                "w-full flex items-center justify-between px-8 py-5 text-[1.2rem] font-semibold transition-colors " +
                (isActive
                  ? "bg-[#8B6352] text-white"
                  : "text-[#5D4037] hover:bg-[#F8F5F2]")
              }
            >
              <span>{item.label}</span>
              <Icon size={22} />
            </button>
          );
        })}
      </nav>
    </aside>
  );
}