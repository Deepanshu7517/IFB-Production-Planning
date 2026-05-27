import React, { useState, useEffect } from "react";
import axios from "axios";
// Here we imported the React and axios library]

interface ChildPart {
  partCode: string;
  description: string;
  qty: number;
  unit: string;
}
// Here we made the ChildPart interface which is used in the MasterItem interface to define the childPartList property. This interface has four properties: partCode, description, qty, and unit, all of which are required and have specific types (string for partCode, description, and unit; number for qty).
interface MasterItem {
  _id?: string;
  [key: string]: any;
  childPartList?: ChildPart[];
}
// Here we made the MasterItem with the id and the key value pair and the childPartList which is an array of ChildPart objects. This interface is used to define the structure of the data for each master item, allowing for flexibility in the properties while also providing a specific structure for child parts when applicable.
interface SelectOption {
  _id: string;
  [key: string]: any;
}
// Here we made the interface SelectOption which is used for the dropdown options in the form. It has an _id property which is a string and a key value pair to allow for additional properties as needed. This interface helps to ensure that the options used in the dropdowns have a consistent structure, making it easier to manage and use them throughout the application.
type MasterType =
  | "Plant"
  | "AssemblyLine"
  | "Model"
  | "BOM"
  | "Matrix"
  | "Users";
// This MasterType is a TypeScript union type that defines the possible values for the activeTab state in the Masters component. It restricts the activeTab to only be one of the specified strings: "Plant", "AssemblyLine", "Model", "BOM", "Matrix", or "Users". This helps to ensure type safety and prevents invalid values from being assigned to activeTab, which is crucial for rendering the correct content based on the selected master type.
const MASTER_CONFIG: Record<MasterType, { label: string }> = {
  Plant: { label: "Plant" },
  AssemblyLine: { label: "Assembly Line" },
  Model: { label: "Model" },
  BOM: { label: "BOM" },
  Matrix: { label: "Matrix" },
  Users: { label: "Users" },
};
// This is MASTER_CONFIG object is a configuration object that maps each MasterType to a label. It is used to provide a human-readable label for each master type, which can be displayed in the UI, such as in the tab headers or dropdowns. By using this configuration object, we can easily manage and update the labels for each master type in one central location, improving maintainability and readability of the code.
// const API_URL = "http://localhost:5001/api/masters";
// const API_URL = `${window.location.protocol}//${window.location.hostname}:5001/api/masters`;
let currentHost = window.location.hostname;
// Here we get the localhost
// If running inside the Tauri desktop wrapper, route traffic to the local sidecar
if (currentHost === "tauri.localhost") {
  currentHost = "localhost";
}

const API_URL = `http://${currentHost}:5001/api/masters`;
// ── SearchSelect — reusable searchable dropdown ───────────────────────────────
interface SearchSelectOption {
  value: string;
  label: string;
}
// Here we have the interface type SearchSelectOption which defines the structure of the options that will be passed to the SearchSelect component. Each option has a value and a label, both of which are strings. This interface helps to ensure that the options used in the SearchSelect component have a consistent structure, making it easier to manage and use them throughout the application.
interface SearchSelectProps {
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}
// Here we have the SearchSelectProps interface which defines the props that the SearchSelect component will receive. It includes an array of options (of type SearchSelectOption), a value (string) that represents the currently selected option, an onChange function that is called when the selected option changes, an optional placeholder string for when no option is selected, and an optional required boolean to indicate if the selection is required. This interface helps to ensure that the SearchSelect component receives the correct props with the expected types, improving type safety and maintainability of the code.

const SearchSelect: React.FC<SearchSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Search...",
  required,
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger button — shows selected label or placeholder */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setQuery("");
        }}
        className={`input input-bordered w-full text-left flex items-center justify-between text-sm ${!selected ? "text-base-content/40" : ""}`}
        style={{ minHeight: 48 }}
      >
        <span className="truncate">
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className="w-4 h-4 shrink-0 ml-2 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Hidden native input for form validation */}
      {required && (
        <input
          tabIndex={-1}
          required
          value={value}
          onChange={() => {}}
          style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
        />
      )}

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-xl shadow-xl overflow-hidden"
          style={{ maxHeight: 260 }}
        >
          {/* Search input inside dropdown */}
          <div className="p-2 border-b border-base-200 sticky top-0 bg-base-100">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search..."
              className="input input-sm input-bordered w-full"
            />
          </div>
          {/* Options list */}
          <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-base-content/40 text-center">
                No results
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-base-200 transition-colors
                    ${opt.value === value ? "bg-primary/10 text-primary font-semibold" : ""}`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
const Masters: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MasterType>("Plant");
  const [items, setItems] = useState<MasterItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<MasterItem>({});
  const [savingShiftFor, setSavingShiftFor] = useState<string | null>(null);
  // BOM upload
  const [bomUploading, setBomUploading] = useState(false);
  const [bomUploadStatus, setBomUploadStatus] = useState("");
  const [expandedBomId, setExpandedBomId] = useState<string | null>(null);

  // BOM Edit Meta modal (price + model)
  const [metaItem, setMetaItem] = useState<MasterItem | null>(null);
  const [metaPrice, setMetaPrice] = useState<string>("");
  const [metaModelId, setMetaModelId] = useState<string>(""); // ObjectId of chosen Model
  const [metaSaving, setMetaSaving] = useState(false);

  // Relational dropdowns
  const [plants, setPlants] = useState<SelectOption[]>([]);
  const [assemblyLines, setAssemblyLines] = useState<SelectOption[]>([]);
  const [models, setModels] = useState<SelectOption[]>([]);
  const [boms, setBoms] = useState<SelectOption[]>([]);
  const [search, setSearch] = useState("");

  // const filteredBoms = boms.filter((b) =>
  //   `${b.partNumber} ${b.partName} ${b.model?.modelName || ""}`
  //     .toLowerCase()
  //     .includes(search.toLowerCase())
  // );
  const bomToMatrixMap = new Map(
    items
      .filter((item) => item.bom?.partNumber)
      .map((item) => [item.bom.partNumber, item]),
  );
  const usedBomPartNumbers = items
    .filter((item) => item.bom?.partNumber)
    .map((item) => item.bom.partNumber);
  const currentSelectedBom =
    formData._bomPartNumber || formData.bom?.partNumber;

  const filteredBoms = boms
    .filter(
      (b) =>
        !usedBomPartNumbers.includes(b.partNumber) ||
        b.partNumber === currentSelectedBom, // ✅ allow current one
    )
    .filter((b) =>
      `${b.partNumber} ${b.partName} ${b.model?.modelName || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/${activeTab.toLowerCase()}`);
      setItems(res.data);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  const fetchSupportData = async () => {
    try {
      if (activeTab === "AssemblyLine") {
        setPlants((await axios.get(`${API_URL}/plant`)).data);
      }
      if (activeTab === "Model") {
        setAssemblyLines((await axios.get(`${API_URL}/assemblyline`)).data);
      }
      if (activeTab === "BOM") {
        setModels((await axios.get(`${API_URL}/model`)).data);
      }
      if (activeTab === "Matrix") {
        // Matrix only needs BOMs — model is auto-derived from the selected BOM
        setBoms((await axios.get(`${API_URL}/bom`)).data);
      }
    } catch (err) {
      console.error("Support data error:", err);
    }
  };

  useEffect(() => {
    fetchData();
    setSearchTerm("");
    fetchSupportData();
    setExpandedBomId(null);
    setBomUploadStatus("");
    setMetaItem(null);
  }, [activeTab]);

  // ── BOM Upload ─────────────────────────────────────────────────────────────
  const handleBomExcelUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBomUploading(true);
    setBomUploadStatus("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await axios.post(`${API_URL}/BOM/upload-excel`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // if (res.data.success) {
      //   const s = res.data.summary;
      //   setBomUploadStatus(
      //     `✅ ${res.data.message}` +
      //     (s ? ` (Created: ${s.created}, Updated: ${s.updated}, Unchanged: ${s.unchanged})` : "")
      //   );
      //   fetchData();
      // }
      // if (res.data.success) {
      //   const s = res.data.summary;
      //   let msg = `✅ ${res.data.message}`;
      //   if (s) {
      //     msg += ` (Created: ${s.created}, Updated: ${s.updated}, Unchanged: ${s.unchanged})`;
      //     if (s.modelNotFound > 0) {
      //       msg += ` ⚠️ ${s.modelNotFound} part(s) had unrecognized model names — set them manually via Edit.`;
      //     }
      //   }
      //   setBomUploadStatus(msg);
      //   fetchData();
      // }
      if (res.data.success) {
        const s = res.data.summary || {};

        let msg = `✅ ${res.data.message}`;

        // Only show stats if they actually exist
        const stats: string[] = [];

        if (typeof s.created === "number") {
          stats.push(`Created: ${s.created}`);
        }

        if (typeof s.updated === "number") {
          stats.push(`Updated: ${s.updated}`);
        }

        if (typeof s.unchanged === "number") {
          stats.push(`Unchanged: ${s.unchanged}`);
        }

        if (stats.length > 0) {
          msg += ` (${stats.join(", ")})`;
        }

        if (typeof s.modelNotFound === "number" && s.modelNotFound > 0) {
          msg += ` ⚠️ ${s.modelNotFound} part(s) had unrecognized model names — set them manually via Edit.`;
        }

        setBomUploadStatus(msg);
        fetchData();
      }
    } catch (err: any) {
      setBomUploadStatus(`❌ ${err.response?.data?.message || err.message}`);
    } finally {
      setBomUploading(false);
      e.target.value = "";
    }
  };

  // ── BOM Meta modal ─────────────────────────────────────────────────────────
  const openMetaModal = (item: MasterItem) => {
    setMetaItem(item);
    setMetaPrice(item.price ? String(item.price) : "");
    setMetaModelId(item.model?._id || "");
  };

  const handleMetaSave = async () => {
    if (!metaItem?._id) return;
    setMetaSaving(true);
    try {
      await axios.patch(`${API_URL}/BOM/${metaItem._id}/meta`, {
        price: parseFloat(metaPrice) || 0,
        modelObjId: metaModelId || null, // send MongoDB _id of the Model
      });
      setMetaItem(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setMetaSaving(false);
    }
  };

  // ── Search ─────────────────────────────────────────────────────────────────
  const filteredItems = items.filter((item) => {
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    switch (activeTab) {
      case "Plant":
        return (
          item.plantName?.toLowerCase().includes(q) ||
          item.plantId?.toLowerCase().includes(q)
        );
      case "AssemblyLine":
        return (
          item.assemblyLineName?.toLowerCase().includes(q) ||
          item.plant?.plantName?.toLowerCase().includes(q)
        );
      case "Model":
        return (
          item.modelName?.toLowerCase().includes(q) ||
          item.assemblyLine?.assemblyLineName?.toLowerCase().includes(q) ||
          item.assemblyLine?.plant?.plantName?.toLowerCase().includes(q)
        );
      case "BOM":
        return (
          item.partNumber?.toLowerCase().includes(q) ||
          item.partName?.toLowerCase().includes(q) ||
          item.model?.modelName?.toLowerCase().includes(q) ||
          item.model?.assemblyLine?.plant?.plantName?.toLowerCase().includes(q)
        );
      case "Matrix":
        return (
          item.model?.modelName?.toLowerCase().includes(q) ||
          item.bom?.partNumber?.toLowerCase().includes(q) ||
          item.shift?.toLowerCase().includes(q)
        );
      case "Users":
        return (
          item.name?.toLowerCase().includes(q) ||
          item.email?.toLowerCase().includes(q) ||
          item.username?.toLowerCase().includes(q) ||
          item.employeeId?.toLowerCase().includes(q) ||
          item.department?.toLowerCase().includes(q)
        );
      default:
        return Object.values(item).some((v) =>
          v?.toString().toLowerCase().includes(q),
        );
    }
  });

  // ── CRUD modal helpers ─────────────────────────────────────────────────────
  const openModal = (item: MasterItem | null = null) => {
    setIsEditing(!!item);
    setFormData(item ? { ...item } : {});
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = isEditing
        ? `${API_URL}/${activeTab.toLowerCase()}/${formData._id}`
        : `${API_URL}/${activeTab.toLowerCase()}`;
      const method = isEditing ? "put" : "post";

      // Build the body based on the active tab
      let body: Record<string, any> = {};

      if (activeTab === "Plant") {
        body = { plantName: formData.plantName };
      }

      if (activeTab === "AssemblyLine") {
        body = {
          assemblyLineName: formData.assemblyLineName,
          capacity: Number(formData.capacity),
          // 👇 CHANGE IS HERE: Fallback to existing ID if the dropdown wasn't clicked
          plantObjId:
            formData._plantObjId || formData.plantRef || formData.plant?._id,
        };
      }

      if (activeTab === "Model") {
        body = {
          modelName: formData.modelName,
          // 👇 CHANGE IS HERE: Fallback to existing ID
          assemblyLineObjId:
            formData._assemblyLineObjId ||
            formData.assemblyLineRef ||
            formData.assemblyLine?._id,
        };
      }

      if (activeTab === "Matrix") {
        body = {
          // 👇 CHANGE IS HERE: Fallback to existing Part Number
          bomPartNumber: formData._bomPartNumber || formData.bom?.partNumber,
          shift: formData.shift,
          manpowerAvailability: Number(formData.manpowerAvailability ?? 0),
        };
      }

      if (activeTab === "Users") {
        const { _id, __v, createdAt, updatedAt, id, ...rest } = formData;
        body = {
          name: rest.name,
          username: rest.username,
          email: rest.email,
          employeeId: rest.employeeId,
          role: rest.role,
          department: rest.department,
          password: rest.password,
        };
      }
      await axios[method](url, body);
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      console.error("Save Error:", err);
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this entry?")) {
      await axios.delete(`${API_URL}/${activeTab.toLowerCase()}/${id}`);
      fetchData();
    }
  };
  const handleMatrixShiftChange = async (
    item: MasterItem,
    shift: "A" | "B" | "C",
  ) => {
    const partNumber = item.bom?.partNumber;
    if (!partNumber) return;

    const previousItems = items;

    setSavingShiftFor(partNumber);

    setItems((current) =>
      current.map((row) =>
        row.bom?.partNumber === partNumber ? { ...row, shift } : row,
      ),
    );

    try {
      // const res = await axios.patch(
      //   `${API_URL}/matrix/${encodeURIComponent(partNumber)}/shift`,
      //   { shift },
      // );

      // setItems((current) =>
      //   current.map((row) =>
      //     row.bom?.partNumber === partNumber
      //       ? { ...row, ...res.data.data }
      //       : row,
      //   ),
      // );
      setItems((current) =>
        current.map((row) =>
          row.bom?.partNumber === partNumber ? { ...row, shift } : row,
        ),
      );
    } catch (err: any) {
      setItems(previousItems);
      alert(err.response?.data?.message || err.message);
    } finally {
      setSavingShiftFor(null);
    }
  };
  // ── Table Headers ──────────────────────────────────────────────────────────
  const renderTableHeaders = () => {
    switch (activeTab) {
      case "Plant":
        return (
          <>
            <th>Plant ID</th>
            <th>Plant Name</th>
            <th>Actions</th>
          </>
        );

      case "AssemblyLine":
        return (
          <>
            <th>ID</th>
            <th>Name</th>
            <th>Capacity (8 hrs)</th>
            <th>Plant</th>
            <th>Actions</th>
          </>
        );

      case "Model":
        return (
          <>
            <th>Model ID</th>
            <th>Model Name</th>
            <th>Assembly Line</th>
            <th>Plant</th>
            <th>Actions</th>
          </>
        );

      // case "BOM":
      //   return (
      //     <>
      //       <th>Part Number</th>
      //       <th>FG Description</th>
      //       <th>Model</th>
      //       <th>Assembly Line</th>
      //       <th>Plant</th>
      //       <th className="text-right">Price (₹)</th>
      //       <th>Child Parts</th>
      //       <th>Last Updated</th>
      //       <th>Actions</th>
      //     </>
      //   );
      case "BOM":
        return (
          <>
            <th>Part Number</th>
            <th>FG Description</th>
            <th>Model</th>
            <th>Assembly Line</th>
            <th>Plant</th>
            <th className="text-right">Shift Throughput</th>
            <th>Child Parts</th>
            <th>Last Updated</th>
            <th>Actions</th>
          </>
        );
      case "Matrix":
        return (
          <>
            <th>Plant</th>
            <th>Assembly Line</th>
            <th>Capacity</th>
            <th>Model</th>
            <th>BOM Part Number</th>
            <th>Part Name</th>
            {/* <th className="text-right">Price (₹)</th> */}
            <th>Child Parts</th>
            <th>Shift</th>
            {/* <th>Actions</th> */}
          </>
        );

      case "Users":
        return (
          <>
            <th>Name</th>
            <th>Username</th>
            <th>Email</th>
            <th>Employee ID</th>
            <th>Department</th>
            <th>Actions</th>
          </>
        );

      default:
        return (
          <>
            <th>Details</th>
            <th>Actions</th>
          </>
        );
    }
  };

  // ── Table Rows ─────────────────────────────────────────────────────────────
  const renderTableRow = (item: MasterItem) => {
    const actions = (
      <div className="flex gap-2">
        <button
          className="btn btn-ghost btn-xs text-info"
          onClick={() => openModal(item)}
        >
          Edit
        </button>
        <button
          className="btn btn-ghost btn-xs text-error"
          onClick={() => item._id && handleDelete(item._id)}
        >
          Delete
        </button>
      </div>
    );

    switch (activeTab) {
      case "Plant":
        return (
          <>
            <td className="font-mono text-xs font-semibold">{item.plantId}</td>
            <td className="font-semibold">{item.plantName}</td>
            <td>{actions}</td>
          </>
        );

      case "AssemblyLine":
        return (
          <>
            <td className="font-mono text-xs font-semibold">
              {item.assemblyLineId}
            </td>
            <td>{item.assemblyLineName}</td>
            <td className="tabular-nums">{item.capacity}</td>
            <td>
              <span className="badge badge-ghost badge-sm">
                {item.plant?.plantName || "—"}
              </span>
            </td>
            <td>{actions}</td>
          </>
        );

      case "Model":
        return (
          <>
            <td className="font-mono text-xs font-semibold">{item.modelId}</td>
            <td>{item.modelName}</td>
            <td>
              <span className="badge badge-ghost badge-sm">
                {item.assemblyLine?.assemblyLineName || "—"}
              </span>
            </td>
            <td>
              <span className="badge badge-ghost badge-sm">
                {item.assemblyLine?.plant?.plantName || "—"}
              </span>
            </td>
            <td>{actions}</td>
          </>
        );

      case "BOM": {
        const isExpanded = expandedBomId === item._id;
        const childCount = item.childPartList?.length ?? 0;
        const hasModel = !!item.model?.modelId;
        // const hasPrice = item.price != null && item.price !== 0;
        return (
          <>
            <td className="font-mono font-semibold text-sm">
              {item.partNumber}
            </td>
            <td>{item.partName}</td>

            {/* Model — manually set */}
            <td>
              {hasModel ? (
                <span className="badge badge-primary badge-sm">
                  {item.model.modelName}
                </span>
              ) : (
                <span className="opacity-30 text-xs italic">not set</span>
              )}
            </td>

            {/* Assembly Line — auto from model snapshot */}
            <td>
              {item.model?.assemblyLine?.assemblyLineId ? (
                <div>
                  <span className="font-mono text-xs font-semibold">
                    {item.model.assemblyLine.assemblyLineId}
                  </span>
                  <div className="text-xs opacity-60">
                    {item.model.assemblyLine.assemblyLineName}
                  </div>
                </div>
              ) : (
                <span className="opacity-30 text-xs">—</span>
              )}
            </td>

            {/* Plant — auto from model → assemblyLine → plant snapshot */}
            <td>
              {item.model?.assemblyLine?.plant?.plantId ? (
                <div>
                  <span className="font-mono text-xs font-semibold">
                    {item.model.assemblyLine.plant.plantId}
                  </span>
                  <div className="text-xs opacity-60">
                    {item.model.assemblyLine.plant.plantName}
                  </div>
                </div>
              ) : (
                <span className="opacity-30 text-xs">—</span>
              )}
            </td>

            {/* <td className="text-right font-semibold tabular-nums">
              {hasPrice ? (
                `₹${Number(item.price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              ) : (
                <span className="opacity-30 text-xs italic font-normal">
                  not set
                </span>
              )}
            </td> */}
            <td className="text-right font-semibold tabular-nums">
              {item.model?.assemblyLine?.capacity != null ? (
                <span className="badge badge-ghost badge-sm">
                  {item.model.assemblyLine.capacity.toLocaleString()} u/shift
                </span>
              ) : (
                <span className="opacity-30 text-xs">—</span>
              )}
            </td>

            <td>
              <button
                className={`btn btn-xs ${isExpanded ? "btn-neutral" : "btn-outline"}`}
                onClick={() => setExpandedBomId(isExpanded ? null : item._id!)}
              >
                {isExpanded
                  ? "▲ Collapse"
                  : `▼ ${childCount} Part${childCount !== 1 ? "s" : ""}`}
              </button>
              {isExpanded && (
                <div className="mt-2 overflow-x-auto">
                  <table className="table table-compact w-full bg-base-200/60 rounded-md text-xs">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Part Code</th>
                        <th>Description</th>
                        <th className="text-right">Qty</th>
                        <th>Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.childPartList?.map((c, i) => (
                        <tr key={i} className="hover">
                          <td className="opacity-40">{i + 1}</td>
                          <td className="font-mono font-semibold">
                            {c.partCode}
                          </td>
                          <td>{c.description}</td>
                          <td className="text-right">{c.qty}</td>
                          <td>
                            <span className="badge badge-ghost badge-sm">
                              {c.unit}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </td>

            <td className="text-xs opacity-60">
              {item.lastUpdated
                ? new Date(item.lastUpdated).toLocaleDateString("en-IN")
                : "—"}
            </td>

            <td>
              <div className="flex gap-2">
                <button
                  className="btn btn-ghost btn-xs text-info"
                  onClick={() => openMetaModal(item)}
                  title="Set Price & Model"
                >
                  Edit
                </button>
                {/* <button
                  className="btn btn-ghost btn-xs text-error"
                  onClick={() => item._id && handleDelete(item._id)}
                >
                  Delete
                </button> */}
              </div>
            </td>
          </>
        );
      }

      case "Matrix": {
        const bom = item.bom ?? {};
        const model = item.model ?? {};
        const al = model.assemblyLine ?? {};
        const plant = al.plant ?? {};
        const childCount = bom.childPartList?.length ?? 0;
        return (
          <>
            {/* Plant */}
            <td>
              <div className="font-mono text-xs font-semibold">
                {plant.plantId || "—"}
              </div>
              <div className="text-xs opacity-60">{plant.plantName}</div>
            </td>

            {/* Assembly Line */}
            <td>
              <div className="font-mono text-xs font-semibold">
                {al.assemblyLineId || "—"}
              </div>
              <div className="text-xs opacity-60">{al.assemblyLineName}</div>
            </td>

            {/* Capacity */}
            <td className="tabular-nums text-sm font-semibold">
              {al.capacity != null ? (
                <span className="badge badge-ghost badge-sm">
                  {al.capacity} u/shift
                </span>
              ) : (
                <span className="opacity-30">—</span>
              )}
            </td>

            {/* Model */}
            <td>
              <div className="font-mono text-xs font-semibold">
                {model.modelId || "—"}
              </div>
              <div className="text-xs opacity-60">{model.modelName}</div>
            </td>

            {/* BOM Part Number */}
            <td className="font-mono text-xs font-semibold">
              {bom.partNumber || "—"}
            </td>

            {/* Part Name */}
            <td className="text-sm">{bom.partName || "—"}</td>

            {/* Price */}
            {/* <td className="text-right tabular-nums text-sm font-semibold">
              {bom.price ? (
                `₹${Number(bom.price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
              ) : (
                <span className="opacity-30 text-xs font-normal italic">
                  not set
                </span>
              )}
            </td> */}

            {/* Child Parts */}
            <td>
              <span className="badge badge-outline badge-sm">
                {childCount} part{childCount !== 1 ? "s" : ""}
              </span>
            </td>

            {/* Shift */}
            {/* <td>
              <span className="badge badge-primary badge-sm font-bold">
                Shift {item.shift}
              </span>
            </td> */}
            <td>
              <div className="flex items-center gap-4 min-w-56">
                {(["A", "B", "C"] as const).map((s) => (
                  <label
                    key={s}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={`matrix-shift-${bom.partNumber || item._id}`}
                      className="radio radio-primary radio-sm"
                      value={s}
                      // checked={item.shift === s}
                      checked={(item.shift || "A") === s}
                      disabled={savingShiftFor === bom.partNumber}
                      onChange={() => handleMatrixShiftChange(item, s)}
                    />
                    <span className="text-sm font-medium">Shift {s}</span>
                  </label>
                ))}

                {/* {savingShiftFor === bom.partNumber && (
                  <span className="loading loading-spinner loading-xs" />
                )} */}
                <span className="inline-flex w-4 justify-center">
                  {savingShiftFor === bom.partNumber && (
                    <span className="loading loading-spinner loading-xs" />
                  )}
                </span>
              </div>
            </td>
            {/* <td>{actions}</td> */}
          </>
        );
      }

      case "Users":
        return (
          <>
            <td className="font-semibold">{item.name}</td>
            <td>{item.username}</td>
            <td>{item.email}</td>
            <td className="font-mono text-xs font-semibold">
              {item.employeeId}
            </td>
            <td>
              <span className="badge badge-ghost badge-sm">
                {item.department || "—"}
              </span>
            </td>
            <td>{actions}</td>
          </>
        );

      default:
        return (
          <>
            <td className="text-xs">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(item, null, 2)}
              </pre>
            </td>
            <td>{actions}</td>
          </>
        );
    }
  };

  // ── Modal Form ─────────────────────────────────────────────────────────────
  const renderModalForm = () => {
    // ── PLANT ────────────────────────────────────────────────────────────────
    if (activeTab === "Plant") {
      return (
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Plant Name</span>
          </label>
          <input
            className="input input-bordered"
            value={formData.plantName || ""}
            onChange={(e) =>
              setFormData({ ...formData, plantName: e.target.value })
            }
            required
          />
          {isEditing && (
            <p className="text-xs opacity-50 mt-1">
              Plant ID: {formData.plantId} (auto-generated)
            </p>
          )}
        </div>
      );
    }

    // ── ASSEMBLY LINE ────────────────────────────────────────────────────────
    if (activeTab === "AssemblyLine") {
      return (
        <div className="grid grid-cols-1 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                Assembly Line Name
              </span>
            </label>
            <input
              className="input input-bordered"
              value={formData.assemblyLineName || ""}
              onChange={(e) =>
                setFormData({ ...formData, assemblyLineName: e.target.value })
              }
              required
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                Shift Throughput (8 hrs)
              </span>
            </label>
            <input
              type="number"
              min="1"
              className="input input-bordered"
              value={formData.capacity || ""}
              onChange={(e) =>
                setFormData({ ...formData, capacity: e.target.value })
              }
              required
            />
          </div>
          {/* <div className="form-control">
            <label className="label"><span className="label-text font-semibold">Plant</span></label>
            <select
              className="select select-bordered"
              value={formData._plantObjId || formData.plant?._id || ""}
              onChange={(e) => setFormData({ ...formData, _plantObjId: e.target.value })}
              required
            >
              <option value="">Select Plant</option>
              {plants.map((p) => (
                <option key={p._id} value={p._id}>{p.plantId} — {p.plantName}</option>
              ))}
            </select>
          </div> */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Plant</span>
            </label>
            <SearchSelect
              options={plants.map((p) => ({
                value: p._id,
                label: `${p.plantId} — ${p.plantName}`,
              }))}
              value={formData._plantObjId || formData.plant?._id || ""}
              onChange={(val) => setFormData({ ...formData, _plantObjId: val })}
              placeholder="Search plant..."
              required
            />
          </div>
          {isEditing && (
            <p className="text-xs opacity-50">
              Assembly Line ID: {formData.assemblyLineId} (auto-generated)
            </p>
          )}
        </div>
      );
    }

    // ── MODEL ────────────────────────────────────────────────────────────────
    if (activeTab === "Model") {
      return (
        <div className="grid grid-cols-1 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Model Name</span>
            </label>
            <input
              className="input input-bordered"
              value={formData.modelName || ""}
              onChange={(e) =>
                setFormData({ ...formData, modelName: e.target.value })
              }
              required
            />
          </div>
          {/* <div className="form-control">
            <label className="label"><span className="label-text font-semibold">Assembly Line</span></label>
            <select
              className="select select-bordered"
              value={formData._assemblyLineObjId || formData.assemblyLine?._id || ""}
              onChange={(e) => setFormData({ ...formData, _assemblyLineObjId: e.target.value })}
              required
            >
              <option value="">Select Assembly Line</option>
              {assemblyLines.map((al) => (
                <option key={al._id} value={al._id}>
                  {al.assemblyLineId} — {al.assemblyLineName}
                  {al.plant?.plantName ? ` (${al.plant.plantName})` : ""}
                </option>
              ))}
            </select>
          </div> */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Assembly Line</span>
            </label>
            <SearchSelect
              options={assemblyLines.map((al) => ({
                value: al._id,
                label: `${al.assemblyLineId} — ${al.assemblyLineName}${al.plant?.plantName ? ` (${al.plant.plantName})` : ""}`,
              }))}
              value={
                formData._assemblyLineObjId || formData.assemblyLine?._id || ""
              }
              onChange={(val) =>
                setFormData({ ...formData, _assemblyLineObjId: val })
              }
              placeholder="Search assembly line..."
              required
            />
          </div>
          {isEditing && (
            <p className="text-xs opacity-50">
              Model ID: {formData.modelId} (auto-generated)
            </p>
          )}
        </div>
      );
    }

    // ── MATRIX ───────────────────────────────────────────────────────────────
    // Model is auto-derived from the BOM's embedded model snapshot.
    // User only selects: BOM (FG Part) + Shift.
    if (activeTab === "Matrix") {
      const selectedBomObj = boms.find(
        (b) => b.partNumber === formData._bomPartNumber,
      );
      const childCount = selectedBomObj?.childPartList?.length ?? 0;
      const bom = selectedBomObj;
      const model = bom?.model ?? {};
      const al = model?.assemblyLine ?? {};
      const plant = al?.plant ?? {};

      return (
        <div className="grid grid-cols-1 gap-5">
          {/* Step 1 — BOM */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                Step 1 — Select BOM (FG Part)
              </span>
              <span className="label-text-alt opacity-50">
                {boms.length} available
              </span>
            </label>

            {/* 🔍 Search Input */}

            {/* 📦 Select (filtered) */}
            <select
              className="select select-bordered open"
              value={formData._bomPartNumber || formData.bom?.partNumber || ""}
              onChange={(e) => {
                const selectedPartNumber = e.target.value;

                const existingMatrix = bomToMatrixMap.get(selectedPartNumber);

                if (existingMatrix && !isEditing) {
                  // 🚨 Already exists → open in edit mode instead of creating new
                  setShowModal(false);

                  setTimeout(() => {
                    openModal(existingMatrix); // reuse your existing edit flow
                  }, 100);

                  return;
                }

                // ✅ Normal flow (new entry)
                setFormData({
                  ...formData,
                  _bomPartNumber: selectedPartNumber,
                });
              }}
              required
            >
              <input
                type="text"
                placeholder="Search BOMs by Part Number, Name, or Model..."
                className="input input-bordered mb-2 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <option value="">Select BOM FG Part</option>

              {filteredBoms.map((b) => (
                <option key={b._id} value={b.partNumber}>
                  {b.partNumber} — {b.partName}
                  {b.model?.modelName
                    ? ` · ${b.model.modelName}`
                    : " ⚠️ no model"}
                </option>
              ))}
            </select>

            {boms.length > 0 && boms.some((b) => !b.model?.modelId) && (
              <p className="text-xs text-warning mt-1">
                ⚠️ Some BOMs have no Model assigned — edit them in the BOM tab
                first.
              </p>
            )}
          </div>

          {/* Auto-derived hierarchy preview */}
          {bom && (
            <div className="bg-base-200 rounded-lg p-3 text-xs space-y-2">
              <p className="font-semibold opacity-40 uppercase tracking-wide text-[10px]">
                Auto-derived from selected BOM
              </p>

              {model.modelId ? (
                <>
                  {/* Plant row */}
                  <div className="flex items-center gap-3">
                    <span className="badge badge-outline badge-sm font-mono shrink-0">
                      {plant.plantId || "—"}
                    </span>
                    <span className="font-semibold">
                      {plant.plantName || (
                        <span className="opacity-30 italic">Plant not set</span>
                      )}
                    </span>
                  </div>

                  {/* Assembly Line row */}
                  <div className="flex items-center gap-3 pl-4 border-l-2 border-base-300">
                    <span className="badge badge-outline badge-sm font-mono shrink-0">
                      {al.assemblyLineId || "—"}
                    </span>
                    <span>
                      {al.assemblyLineName || (
                        <span className="opacity-30 italic">Line not set</span>
                      )}
                    </span>
                    {al.capacity != null && (
                      <span className="ml-auto opacity-50 tabular-nums">
                        {al.capacity} units/shift
                      </span>
                    )}
                  </div>

                  {/* Model row */}
                  <div className="flex items-center gap-3 pl-8 border-l-2 border-base-300">
                    <span className="badge badge-primary badge-sm font-mono shrink-0">
                      {model.modelId}
                    </span>
                    <span className="font-semibold">{model.modelName}</span>
                  </div>

                  <div className="divider my-0.5 opacity-20" />
                  <div className="flex flex-wrap gap-x-4 gap-y-1 opacity-70">
                    <span>
                      🔩 Child parts: <strong>{childCount}</strong>
                    </span>
                    {bom.price ? (
                      <span>
                        💰 Price:{" "}
                        <strong>
                          ₹{Number(bom.price).toLocaleString("en-IN")}
                        </strong>
                      </span>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-warning font-semibold">
                  ⚠️ This BOM has no Model assigned. Go to BOM tab → Edit to set
                  one before adding to Matrix.
                </p>
              )}
            </div>
          )}

          {/* Step 2 — Shift */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                Step 2 — Select Shift
              </span>
            </label>
            <div className="flex gap-6 mt-1">
              {(["A", "B", "C"] as const).map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="shift"
                    className="radio radio-primary"
                    value={s}
                    checked={formData.shift === s}
                    onChange={() => setFormData({ ...formData, shift: s })}
                    required
                  />
                  <span className="text-lg font-medium">Shift {s}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // ── USERS ────────────────────────────────────────────────────────────────
    if (activeTab === "Users") {
      const userFields = [
        "name",
        "username",
        "email",
        "employeeId",
        "role",
        "department",
        "password",
      ];
      return (
        <div className="grid grid-cols-2 gap-4">
          {userFields.map((f) => (
            <div key={f} className="form-control">
              <label className="label capitalize">
                <span className="label-text">
                  {f === "employeeId" ? "Employee ID" : f}
                </span>
              </label>
              <input
                type={
                  f === "password"
                    ? "password"
                    : f === "email"
                      ? "email"
                      : "text"
                }
                className="input input-bordered"
                value={formData[f] || ""}
                onChange={(e) =>
                  setFormData({ ...formData, [f]: e.target.value })
                }
                required={f !== "password"} // Make password optional during edit if desired, otherwise required
              />
            </div>
          ))}
        </div>
      );
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      {/* Tab bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-base-100 p-4 rounded-xl shadow-sm border border-base-200">
        <div className="tabs tabs-boxed">
          {(Object.keys(MASTER_CONFIG) as MasterType[]).map((t) => (
            <button
              key={t}
              className={`tab ${activeTab === t ? "tab-active" : ""}`}
              onClick={() => setActiveTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              className="input input-bordered w-full pr-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute inset-y-0 right-3 flex items-center opacity-50">
              🔍
            </span>
          </div>

          {activeTab === "BOM" ? (
            <label
              className={`btn btn-primary ${bomUploading ? "loading" : ""}`}
            >
              📤 {bomUploading ? "Uploading..." : "Upload Excel"}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleBomExcelUpload}
                className="hidden"
                disabled={bomUploading}
              />
            </label>
          ) : (
            <button className="btn btn-primary" onClick={() => openModal()}>
              + Add {activeTab}
            </button>
          )}
        </div>
      </div>

      {/* BOM upload status */}
      {activeTab === "BOM" && bomUploadStatus && (
        <div
          className={`alert ${bomUploadStatus.includes("✅") ? "alert-success" : "alert-error"} mb-4`}
        >
          <span>{bomUploadStatus}</span>
          <button
            className="btn btn-xs btn-ghost ml-auto"
            onClick={() => setBomUploadStatus("")}
          >
            ✕
          </button>
        </div>
      )}

      {/* BOM hint
      {activeTab === "BOM" &&
        items.length > 0 &&
        items.some((i) => !i.model?.modelId || !i.price) && (
          <div className="alert alert-info mb-4 text-sm">
            <span>
              ℹ️ Some BOM entries are missing <strong>Model</strong> or{" "}
              <strong>Price</strong>. Click <strong>Edit</strong> on any row to
              set them. They are preserved on future re-uploads.
            </span>
          </div>
        )} */}
      {activeTab === "BOM" &&
        items.length > 0 &&
        items.some((i) => !i.model?.modelId) && (
          <div className="alert alert-info mb-4 text-sm">
            <span>
              ℹ️ Some BOM entries are missing a <strong>Model</strong>. Click{" "}
              <strong>Edit</strong> on any row to set it.
              {/* It is preserved on future re-uploads. */}
            </span>
          </div>
        )}
      {/* Table */}
      <div className="overflow-x-auto bg-base-100 rounded-lg shadow border border-base-200">
        <table className="table w-full">
          <thead className="bg-base-200">
            <tr>{renderTableHeaders()}</tr>
          </thead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <tr key={item._id} className="hover align-top">
                  {renderTableRow(item)}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={10}
                  className="text-center py-10 opacity-50 italic"
                >
                  No records found{searchTerm ? ` for "${searchTerm}"` : ""}
                  {activeTab === "BOM" &&
                    !searchTerm &&
                    " — upload an Excel file to populate BOM data"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* BOM Edit Meta Modal */}
      {metaItem && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-md">
            <h3 className="text-lg font-bold mb-1">
              Edit BOM — Price &amp; Model
            </h3>
            <p className="font-mono text-sm opacity-60 mb-1">
              {metaItem.partNumber}
            </p>
            <p className="text-xs opacity-40 mb-4">{metaItem.partName}</p>
            {/* <div className="divider text-xs opacity-40 -mt-1 mb-4">
              Not in Excel — set manually · preserved on re-upload
            </div> */}

            {/* <div className="form-control mb-5">
              <label className="label">
                <span className="label-text font-semibold">Price (₹)</span>
                <span className="label-text-alt opacity-50">per unit</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input input-bordered"
                placeholder="e.g. 12500"
                value={metaPrice}
                onChange={(e) => setMetaPrice(e.target.value)}
              />
            </div> */}

            <div className="form-control mb-5">
              <label className="label">
                <span className="label-text font-semibold">Model</span>
                <span className="label-text-alt opacity-50">
                  which model uses this FG part
                </span>
              </label>
              {/* <select
                className="select select-bordered"
                value={metaModelId}
                onChange={(e) => setMetaModelId(e.target.value)}
              >
                <option value="">— No model —</option>
                {models.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.modelId} — {m.modelName}
                    {m.assemblyLine?.plant?.plantName ? ` · ${m.assemblyLine.plant.plantName}` : ""}
                  </option>
                ))}
              </select> */}
              <SearchSelect
                options={[
                  { value: "", label: "— No model —" },
                  ...models.map((m) => ({
                    value: m._id,
                    label: `${m.modelId} — ${m.modelName}${m.assemblyLine?.plant?.plantName ? ` · ${m.assemblyLine.plant.plantName}` : ""}`,
                  })),
                ]}
                value={metaModelId}
                onChange={(val) => setMetaModelId(val)}
                placeholder="Search model..."
              />
              {models.length === 0 && (
                <p className="text-xs text-warning mt-1">
                  ⚠️ No models found — add them in the Model tab first.
                </p>
              )}
            </div>

            {/* Read-only hierarchy — auto-derived from the Model selected above.
                Shows the full Plant → Assembly Line chain from your master data.
                (plantCode from Excel is separate and not shown here.) */}
            {(() => {
              const sel = metaModelId
                ? models.find((x) => x._id === metaModelId)
                : null;
              const al =
                sel?.assemblyLine ?? metaItem.model?.assemblyLine ?? {};
              const plant =
                sel?.assemblyLine?.plant ??
                metaItem.model?.assemblyLine?.plant ??
                {};
              return (
                <div className="bg-base-200 rounded-lg p-3 text-xs mb-5 space-y-2">
                  <p className="font-semibold opacity-40 uppercase tracking-wide text-[10px]">
                    Auto-filled from Model selection ↑
                  </p>

                  {/* Plant row */}
                  <div className="flex items-center gap-3">
                    <span className="badge badge-outline badge-sm font-mono shrink-0">
                      {plant.plantId || "—"}
                    </span>
                    <span className="font-semibold">
                      {plant.plantName || (
                        <span className="opacity-30 italic">Plant not set</span>
                      )}
                    </span>
                  </div>

                  {/* Assembly Line row */}
                  <div className="flex items-center gap-3 pl-4 border-l-2 border-base-300">
                    <span className="badge badge-outline badge-sm font-mono shrink-0">
                      {al.assemblyLineId || "—"}
                    </span>
                    <span>
                      {al.assemblyLineName || (
                        <span className="opacity-30 italic">Line not set</span>
                      )}
                    </span>
                    {al.capacity != null && (
                      <span className="ml-auto opacity-50 tabular-nums">
                        {al.capacity} units/shift
                      </span>
                    )}
                  </div>

                  <div className="divider my-0.5 opacity-20" />
                  <p>
                    <span className="opacity-50">Child Parts:</span>{" "}
                    <strong>{metaItem.childPartList?.length ?? 0}</strong>{" "}
                    <span className="opacity-40">(from Excel upload)</span>
                  </p>
                  <p>
                    <span className="opacity-50">Last Updated:</span>{" "}
                    {metaItem.lastUpdated
                      ? new Date(metaItem.lastUpdated).toLocaleDateString(
                          "en-IN",
                        )
                      : "—"}
                  </p>
                </div>
              );
            })()}

            <div className="modal-action">
              <button className="btn" onClick={() => setMetaItem(null)}>
                Cancel
              </button>
              <button
                className={`btn btn-primary ${metaSaving ? "loading" : ""}`}
                onClick={handleMetaSave}
                disabled={metaSaving}
              >
                {metaSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic CRUD Modal (Plant / AssemblyLine / Model / Matrix / Users) */}
      {showModal && activeTab !== "BOM" && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-2xl">
            <h3 className="text-lg font-bold mb-4">
              {isEditing ? "Edit" : "New"} {activeTab}
            </h3>
            <form onSubmit={handleSave}>
              {renderModalForm()}
              <div className="modal-action">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Masters;
