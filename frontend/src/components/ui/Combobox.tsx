import  { useState } from 'react';

const MandatoryCombobox = ({ options }: { options: string[] }) => {
  // Initialize with the first option to ensure non-null status
  const [selectedItem, setSelectedItem] = useState(options[0] || "");
  const [searchTerm, setSearchTerm] = useState(options[0] || "");
  const [isOpen, setIsOpen] = useState(false);
  
  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBlur = () => {
    // Small timeout to allow the onClick of the dropdown to fire first
    setTimeout(() => {
      setIsOpen(false);
      // If user cleared the input or typed nonsense, revert to last valid selection
      if (!options.includes(searchTerm)) {
        setSearchTerm(selectedItem);
      }
    }, 200);
  };

  return (
    <div className={`dropdown ${isOpen ? "dropdown-open" : ""} w-full max-w-xs`}>
      <label className="form-control w-full">
        <div className="label">
          <span className="label-text font-bold">Select Machine <span className="text-error">*</span></span>
        </div>
        
        <input
          type="text"
          placeholder="Search..."
          className={`input input-bordered w-full ${!searchTerm ? 'input-error' : ''}`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          required
        />
      </label>

      {/* Dropdown Menu */}
      {isOpen && (
        <ul className="dropdown-content menu bg-base-100 rounded-box z-10 w-full p-2 shadow-xl border border-base-200 mt-1 max-h-48 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <li key={index}>
                <button
                  type="button"
                  className={option === selectedItem ? "active" : ""}
                  onClick={() => {
                    setSelectedItem(option);
                    setSearchTerm(option);
                    setIsOpen(false);
                  }}
                >
                  {option}
                </button>
              </li>
            ))
          ) : (
            options.map((option, index) => (
              <li key={index}>
                <button
                  type="button"
                  className={option === selectedItem ? "active" : ""}
                  onClick={() => {
                    setSelectedItem(option);
                    setSearchTerm(option);
                    setIsOpen(false);
                  }}
                >
                  {option}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default MandatoryCombobox;