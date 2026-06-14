export const metrics = [
  { label: 'Total Documents', value: '128', change: '+14 this month', tone: 'gold' },
  { label: 'Pending Review', value: '7', change: 'Needs approval', tone: 'pink' },
  { label: 'Conversations', value: '342', change: 'Today', tone: 'cyan' },
  { label: 'Answer Accuracy', value: '94%', change: '+3.2% vs last week', tone: 'lime' },
]

export const documents = [
  {
    id: 'DOC-2026-001',
    title: 'Enrollment Guidelines 2026',
    owner: 'Registrar Office',
    status: 'Published',
    type: 'PDF',
    date: 'Jun 11, 2026',
  },
  {
    id: 'DOC-2026-002',
    title: 'Scholarship FAQ',
    owner: 'Admissions',
    status: 'Review',
    type: 'DOCX',
    date: 'Jun 10, 2026',
  },
  {
    id: 'DOC-2026-003',
    title: 'Student Handbook',
    owner: 'Student Affairs',
    status: 'Draft',
    type: 'PDF',
    date: 'Jun 8, 2026',
  },
  {
    id: 'DOC-2026-004',
    title: 'Tuition Payment Channels',
    owner: 'Finance Office',
    status: 'Published',
    type: 'PDF',
    date: 'Jun 7, 2026',
  },
  {
    id: 'DOC-2026-005',
    title: 'Clinic Appointment Process',
    owner: 'Health Services',
    status: 'Review',
    type: 'TXT',
    date: 'Jun 6, 2026',
  },
  {
    id: 'DOC-2026-006',
    title: 'Library Borrowing Policy',
    owner: 'Library',
    status: 'Published',
    type: 'DOCX',
    date: 'Jun 5, 2026',
  },
  {
    id: 'DOC-2026-007',
    title: 'Campus Wi-Fi Access Guide',
    owner: 'IT Department',
    status: 'Draft',
    type: 'PDF',
    date: 'Jun 4, 2026',
  },
  {
    id: 'DOC-2026-008',
    title: 'Graduation Clearance Checklist',
    owner: 'Registrar Office',
    status: 'Published',
    type: 'PDF',
    date: 'Jun 3, 2026',
  },
]

export const conversations = [
  {
    id: 'CHAT-001',
    question: 'How do I request my TOR?',
    intent: 'Registrar',
    confidence: '98%',
    status: 'Resolved',
  },
  {
    id: 'CHAT-002',
    question: 'When is enrollment for freshmen?',
    intent: 'Admissions',
    confidence: '95%',
    status: 'Resolved',
  },
  {
    id: 'CHAT-003',
    question: 'Where can I pay tuition?',
    intent: 'Finance',
    confidence: '91%',
    status: 'Resolved',
  },
  {
    id: 'CHAT-004',
    question: 'Can I enroll without clearance?',
    intent: 'Registrar',
    confidence: '64%',
    status: 'Flagged',
  },
]

export const users = [
  {
    id: 'USR-001',
    name: 'Maria Santos',
    role: 'Registrar Admin',
    access: 'Documents, Chat Logs',
    status: 'Active',
  },
  {
    id: 'USR-002',
    name: 'John Reyes',
    role: 'Admissions Staff',
    access: 'Documents',
    status: 'Active',
  },
  {
    id: 'USR-003',
    name: 'Ana Cruz',
    role: 'Super Admin',
    access: 'All modules',
    status: 'Active',
  },
  {
    id: 'USR-004',
    name: 'Paolo Lim',
    role: 'Finance Staff',
    access: 'Chat Logs',
    status: 'Pending',
  },
]

export const navItems = [
  { label: 'Dashboard', view: 'dashboard' },
  { label: 'Documents', view: 'documents' },
  { label: 'Chat Logs', view: 'chatLogs' },
  { label: 'Users', view: 'users' },
  { label: 'Settings', view: 'settings' },
]

export const viewLabels = {
  dashboard: 'Dashboard',
  documents: 'Documents',
  chatLogs: 'Chat Logs',
  users: 'Users',
  settings: 'Settings',
  upload: 'Upload Document',
  faq: 'Add FAQ Answer',
  review: 'Flagged Chats',
  createUser: 'Create Admin User',
}
