import { useState } from "preact/hooks";
import { departments } from "../lib/departments.ts";
import { municipalitiesOf } from "../lib/municipalities.ts";

export default function DirectoryFilters(props: {
  action: string;
  q: string;
  department: string;
  municipality: string;
}) {
  const [department, setDepartment] = useState(props.department);
  const [municipality, setMunicipality] = useState(props.municipality);
  const options = municipalitiesOf(department);
  const prefix = props.action === "/" ? "cuentas" : "lideres";

  function onDepartment(event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value;
    setDepartment(value);
    if (!municipalitiesOf(value).includes(municipality)) {
      setMunicipality("");
    }
  }

  return (
    <form method="get" action={props.action} class="mt-4 flex flex-wrap items-end gap-3">
      <div>
        <label class="mb-2 block text-sm font-semibold text-dark" for={`${prefix}-q`}>
          Buscar
        </label>
        <input
          id={`${prefix}-q`}
          name="q"
          defaultValue={props.q}
          maxLength={80}
          class="form-control"
          placeholder="Nick o nombre"
        />
      </div>
      <div>
        <label class="mb-2 block text-sm font-semibold text-dark" for={`${prefix}-departamento`}>
          Departamento
        </label>
        <select
          id={`${prefix}-departamento`}
          name="department"
          class="form-control"
          value={department}
          onChange={onDepartment}
        >
          <option value="">Todos</option>
          {departments.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div>
        <label class="mb-2 block text-sm font-semibold text-dark" for={`${prefix}-municipio`}>
          Municipio
        </label>
        <select
          id={`${prefix}-municipio`}
          name="municipality"
          class="form-control"
          value={municipality}
          disabled={options.length === 0}
          onChange={(event) => setMunicipality((event.currentTarget as HTMLSelectElement).value)}
        >
          <option value="">{options.length === 0 ? "Elige un departamento" : "Todos"}</option>
          {options.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <button type="submit" class="btn">Filtrar</button>
    </form>
  );
}
