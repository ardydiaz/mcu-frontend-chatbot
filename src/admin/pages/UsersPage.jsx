import BootstrapDataTable from '../components/BootstrapDataTable'
import { StatusBadge } from '../components/Badges'
import { users } from '../data/mockAdminData'

function UsersPage() {
  return (
    <article className="rounded-lg border border-[#ffc52f]/20 bg-white/10 p-5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur xl:col-span-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#ffc52f]">Access Control</p>
          <h3 className="m-0 text-xl font-bold text-white">User Records</h3>
        </div>
        <button className="rounded-lg bg-[#ffc52f] px-4 py-3 font-extrabold text-[#2a003f]" type="button">
          Invite User
        </button>
      </div>
      <BootstrapDataTable
        columns={[
          { key: 'id', label: 'ID', className: 'fw-semibold' },
          { key: 'name', label: 'Name', className: 'fw-bold' },
          { key: 'role', label: 'Role' },
          { key: 'access', label: 'Access' },
          { key: 'status', label: 'Status', render: (user) => <StatusBadge value={user.status} /> },
          {
            key: 'action',
            label: 'Action',
            headerClassName: 'text-end',
            className: 'text-end',
            render: () => (
              <button className="btn btn-sm btn-outline-warning" type="button">
                Edit
              </button>
            ),
          },
        ]}
        rows={users}
        emptyMessage="No admin users found."
      />
    </article>
  )
}

export default UsersPage
