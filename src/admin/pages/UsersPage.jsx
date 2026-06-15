import BootstrapDataTable from '../components/BootstrapDataTable'
import { StatusBadge } from '../components/Badges'
import { users } from '../data/mockAdminData'

function UsersPage() {
  return (
    <article className="rounded-2xl border border-[#5c297c]/12 bg-white p-5 text-[#241433] shadow-[0_18px_50px_rgba(42,0,63,0.08)] xl:col-span-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0a733]">Access Control</p>
          <h3 className="m-0 text-xl font-bold text-[#3b0a57]">User Records</h3>
        </div>
        <button className="rounded-lg bg-[#ffc52f] px-4 py-3 font-extrabold text-[#2a003f] shadow-[0_10px_20px_rgba(255,197,47,0.24)]" type="button">
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
