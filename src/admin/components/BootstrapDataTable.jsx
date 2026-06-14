function BootstrapDataTable({ columns, rows, isLoading = false, emptyMessage }) {
  return (
    <div className={`bootstrap-datatable table-responsive ${isLoading ? 'is-loading' : ''}`}>
      <table className="table table-hover table-striped align-middle mb-0">
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.headerClassName} scope="col" key={column.key}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td className={column.className} key={column.key}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
          {!isLoading && rows.length === 0 && (
            <tr>
              <td className="text-center text-muted py-4" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default BootstrapDataTable
