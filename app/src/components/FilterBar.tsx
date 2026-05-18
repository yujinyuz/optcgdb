import { useAppStore } from '../store'
import {
  ALL_COLORS,
  ALL_CATEGORIES,
  ALL_RARITIES,
  ALL_ATTRIBUTES,
  RARITY_SHORT,
  COLOR_HEX,
  CATEGORY_COLORS,
} from '../types'

function FilterSection({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="text-[10px] font-semibold text-slate-400 dark:text-[#64748b] uppercase tracking-wider mb-1.5">{label}</h3>
      {children}
    </div>
  )
}

function TogglePill({
  active,
  onClick,
  children,
  style,
  className = '',
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all border active:scale-95 ${
        active
          ? 'bg-[#3b82f6]/10 dark:bg-[#3b82f6]/20 text-[#3b82f6] dark:text-[#60a5fa] border-[#3b82f6]/30 dark:border-[#3b82f6]/40'
          : 'text-slate-500 dark:text-[#64748b] border-slate-200 dark:border-[#2e303a] hover:border-slate-300 dark:hover:border-[#3e4050] hover:text-slate-700 dark:hover:text-[#94a3b8]'
      } ${className}`}
      style={style}
    >
      {children}
    </button>
  )
}

function RangeInput({
  label,
  min,
  max,
  onMinChange,
  onMaxChange,
  minPlaceholder,
  maxPlaceholder,
  step = 1,
}: {
  label: string
  min: number | null
  max: number | null
  onMinChange: (val: number | null) => void
  onMaxChange: (val: number | null) => void
  minPlaceholder: string
  maxPlaceholder: string
  step?: number
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        step={step}
        aria-label={`${label} min`}
        placeholder={minPlaceholder}
        value={min ?? ''}
        onChange={(e) => onMinChange(e.target.value === '' ? null : Number(e.target.value))}
        className="w-16 bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-md px-2 py-1 text-[11px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6] text-center"
      />
      <span className="text-slate-400 dark:text-[#64748b] text-[10px]">–</span>
      <input
        type="number"
        step={step}
        aria-label={`${label} max`}
        placeholder={maxPlaceholder}
        value={max ?? ''}
        onChange={(e) => onMaxChange(e.target.value === '' ? null : Number(e.target.value))}
        className="w-16 bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-md px-2 py-1 text-[11px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6] text-center"
      />
    </div>
  )
}

export default function FilterBar() {
  const filters = useAppStore((state) => state.filters)
  const setFilters = useAppStore((state) => state.setFilters)
  const resetFilters = useAppStore((state) => state.resetFilters)
  const sets = useAppStore((state) => state.sets)
  const blocks = useAppStore((state) => state.blocks)

  const toggle = (key: 'colors' | 'categories' | 'rarities' | 'attributes' | 'blocks', value: string | number) => {
    const current = filters[key] as (string | number)[]
    const next = current.includes(value as never)
      ? current.filter((v) => v !== value)
      : [...current, value]
    setFilters({ [key]: next } as Partial<typeof filters>)
  }

  // Debounced search input
  const hasActiveFilters =
    filters.colors.length > 0 ||
    filters.categories.length > 0 ||
    filters.rarities.length > 0 ||
    filters.attributes.length > 0 ||
    filters.blocks.length > 0 ||
    filters.setPrefix !== null ||
    filters.costMin !== null ||
    filters.costMax !== null ||
    filters.powerMin !== null ||
    filters.powerMax !== null ||
    filters.search !== ''

  return (
    <div className="space-y-4">
      {/* Clear all */}
      {hasActiveFilters && (
        <button
          onClick={() => {
            resetFilters()
                  }}
          className="text-[11px] text-[#3b82f6] dark:text-[#60a5fa] hover:underline font-medium"
        >
          Clear all filters
        </button>
      )}

      {/* Colors */}
      <FilterSection label="Colors">
        <div className="flex flex-wrap gap-1">
          {ALL_COLORS.map((color) => (
            <TogglePill
              key={color}
              active={filters.colors.includes(color)}
              onClick={() => toggle('colors', color)}
              style={
                filters.colors.includes(color)
                  ? { backgroundColor: COLOR_HEX[color] + '20', borderColor: COLOR_HEX[color] + '60', color: COLOR_HEX[color] }
                  : {}
              }
            >
              <span className="inline-flex items-center gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: COLOR_HEX[color] }}
                />
                {color}
              </span>
            </TogglePill>
          ))}
        </div>
      </FilterSection>

      {/* Sets */}
      {sets.length > 0 && (
        <FilterSection label="Sets">
          <div className="flex flex-wrap gap-1">
            <TogglePill
              active={filters.setPrefix === null}
              onClick={() => {
                setFilters({ setPrefix: null })
                          }}
            >
              All
            </TogglePill>
            {sets.map((set) => (
              <TogglePill
                key={set}
                active={filters.setPrefix === set}
                onClick={() => {
                  setFilters({ setPrefix: filters.setPrefix === set ? null : set })
                              }}
              >
                {set}
              </TogglePill>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Blocks */}
      {blocks.length > 0 && (
        <FilterSection label="Blocks">
          <div className="flex flex-wrap gap-1">
            {blocks.map((block) => (
              <TogglePill
                key={block}
                active={filters.blocks.includes(block)}
                onClick={() => toggle('blocks', block)}
              >
                {block}
              </TogglePill>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Categories */}
      <FilterSection label="Category">
        <div className="flex flex-wrap gap-1">
          {ALL_CATEGORIES.map((cat) => (
            <TogglePill
              key={cat}
              active={filters.categories.includes(cat)}
              onClick={() => toggle('categories', cat)}
              style={
                filters.categories.includes(cat)
                  ? { backgroundColor: CATEGORY_COLORS[cat] + '20', borderColor: CATEGORY_COLORS[cat] + '60', color: CATEGORY_COLORS[cat] }
                  : {}
              }
            >
              {cat === 'Don' ? 'DON!!' : cat}
            </TogglePill>
          ))}
        </div>
      </FilterSection>

      {/* Rarities */}
      <FilterSection label="Rarities">
        <div className="flex flex-wrap gap-1">
          {ALL_RARITIES.map((r) => (
            <TogglePill
              key={r}
              active={filters.rarities.includes(r)}
              onClick={() => toggle('rarities', r)}
            >
              {RARITY_SHORT[r] || r}
            </TogglePill>
          ))}
        </div>
      </FilterSection>

      {/* Attributes */}
      <FilterSection label="Attributes">
        <div className="flex flex-wrap gap-1">
          {ALL_ATTRIBUTES.map((attr) => (
            <TogglePill
              key={attr}
              active={filters.attributes.includes(attr)}
              onClick={() => toggle('attributes', attr)}
            >
              {attr}
            </TogglePill>
          ))}
        </div>
      </FilterSection>

      {/* Cost range */}
      <FilterSection label="Cost">
        <RangeInput
          label="Cost"
          min={filters.costMin}
          max={filters.costMax}
          onMinChange={(v) => {
            setFilters({ costMin: v })
                  }}
          onMaxChange={(v) => {
            setFilters({ costMax: v })
                  }}
          minPlaceholder="0"
          maxPlaceholder="15"
        />
      </FilterSection>

      {/* Power range */}
      <FilterSection label="Power">
        <RangeInput
          label="Power"
          min={filters.powerMin}
          max={filters.powerMax}
          onMinChange={(v) => {
            setFilters({ powerMin: v })
                  }}
          onMaxChange={(v) => {
            setFilters({ powerMax: v })
                  }}
          minPlaceholder="0"
          maxPlaceholder="20k"
          step={1000}
        />
      </FilterSection>

      {/* Counter range */}
      <FilterSection label="Counter">
        <RangeInput
          label="Counter"
          min={filters.counterMin}
          max={filters.counterMax}
          onMinChange={(v) => {
            setFilters({ counterMin: v })
                  }}
          onMaxChange={(v) => {
            setFilters({ counterMax: v })
                  }}
          minPlaceholder="0"
          maxPlaceholder="2000"
          step={1000}
        />
      </FilterSection>
    </div>
  )
}
