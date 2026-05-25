import { useState } from 'react';
const Select = ({ options }: { options: string[] }) => {
  const [CurrentSelection, setCurrentSelection] = useState(options[0] || "");
  return (
    <select defaultValue={CurrentSelection} onChange={(e) => setCurrentSelection(e.target.value)} className="select">
      {
        options?.map((item, index) => {
          return (
            <option key={index}>{item}</option>
          )
        })
      }
    </select>
  );
}

export default Select;