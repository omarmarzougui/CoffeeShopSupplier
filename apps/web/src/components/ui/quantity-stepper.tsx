type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  ariaLabel?: string;
  size?: "sm" | "md";
};

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max,
  ariaLabel = "Quantity",
  size = "md",
}: Props) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1);

  const btnSize = size === "sm" ? "h-7 w-7 text-sm" : "h-8 w-8 text-sm";

  return (
    <div className="inline-flex items-center rounded-md border border-stone-300 bg-white">
      <button
        type="button"
        onClick={dec}
        aria-label="Decrease quantity"
        className={`inline-flex items-center justify-center text-stone-500 hover:bg-stone-50 hover:text-stone-900 disabled:opacity-40 ${btnSize}`}
        disabled={value <= min}
      >
        −
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          onChange(Number.isNaN(v) ? min : Math.max(min, max !== undefined ? Math.min(max, v) : v));
        }}
        aria-label={ariaLabel}
        className="w-12 border-x border-stone-300 py-1 text-center text-sm tabular-nums focus:outline-none"
      />
      <button
        type="button"
        onClick={inc}
        aria-label="Increase quantity"
        className={`inline-flex items-center justify-center text-stone-500 hover:bg-stone-50 hover:text-stone-900 disabled:opacity-40 ${btnSize}`}
        disabled={max !== undefined && value >= max}
      >
        +
      </button>
    </div>
  );
}
