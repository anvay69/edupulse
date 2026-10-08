const departments = ["CSE", "ECE", "ME", "all"];
const years = ["1", "2", "3", "4", "all"];
const sections = ["A", "B", "all"];

function SelectGroup({ label, value, options, onChange, formatOption }) {
  return (
    <fieldset className="audience-group">
      <legend>{label}</legend>
      <div className="audience-options">
        {options.map((option) => (
          <label
            className={`audience-option${value === option ? " audience-option--selected" : ""}`}
            key={option}
          >
            <input
              type="radio"
              name={label}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            {formatOption(option)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function formatAudience({ department, year, section }) {
  const departmentLabel = department === "all" ? "All Departments" : department;
  const yearLabel = year === "all" ? "All Years" : `${year}${year === "1" ? "st" : year === "2" ? "nd" : year === "3" ? "rd" : "th"} Year`;
  const sectionLabel = section === "all" ? "All Sections" : `Section ${section}`;
  return `${departmentLabel} • ${yearLabel} • ${sectionLabel}`;
}

export default function AudienceSelector({ audience, onChange }) {
  return (
    <div className="audience-selector">
      <p className="audience-label">Audience</p>
      <div className="audience-groups">
        <SelectGroup
          label="Department"
          value={audience.department}
          options={departments}
          onChange={(department) => onChange({ ...audience, department })}
          formatOption={(option) => option === "all" ? "All" : option}
        />
        <SelectGroup
          label="Year"
          value={audience.year}
          options={years}
          onChange={(year) => onChange({ ...audience, year })}
          formatOption={(option) => option === "all" ? "All" : `${option}${option === "1" ? "st" : option === "2" ? "nd" : option === "3" ? "rd" : "th"}`}
        />
        <SelectGroup
          label="Section"
          value={audience.section}
          options={sections}
          onChange={(section) => onChange({ ...audience, section })}
          formatOption={(option) => option === "all" ? "All" : option}
        />
      </div>
      <p className="audience-summary" aria-live="polite">{formatAudience(audience)}</p>
    </div>
  );
}
