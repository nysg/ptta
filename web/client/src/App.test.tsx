import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import * as api from './lib/api'

// Mock the API module
vi.mock('./lib/api', () => ({
  api: {
    getWorkspaces: vi.fn(),
    getTasks: vi.fn(),
    getTask: vi.fn(),
    getStats: vi.fn(),
  },
}))

const mockWorkspaces = [
  {
    id: 1,
    path: '/test/workspace1',
    name: 'workspace1',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    path: '/test/workspace2',
    name: 'workspace2',
    created_at: '2024-01-02T00:00:00Z',
  },
]

const mockTasks = [
  {
    id: 1,
    title: 'Test Task 1',
    description: 'Test description 1',
    status: 'active',
    priority: 'high',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    title: 'Test Task 2',
    description: 'Test description 2',
    status: 'completed',
    priority: 'medium',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
]

const mockTaskDetail = {
  id: 1,
  title: 'Test Task 1',
  description: 'Test description 1',
  status: 'active',
  priority: 'high',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  todos: [
    {
      id: 1,
      task_id: 1,
      title: 'Test Todo 1',
      description: 'Todo description',
      status: 'in_progress',
      priority: 'high',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      actions: [
        {
          id: 1,
          todo_id: 1,
          title: 'Test Action 1',
          status: 'done',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
    },
  ],
}

const mockStats = {
  tasks: { total: 2, active: 1, completed: 1 },
  todos: { total: 3, todo: 1, inProgress: 1, done: 1 },
  actions: { total: 5, todo: 2, done: 3 },
}

function renderWithProviders(initialRoute = '/') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </MemoryRouter>
  )
}

describe('App Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('WorkspacesPage (/)', () => {
    it('renders workspaces list on root path', async () => {
      vi.mocked(api.api.getWorkspaces).mockResolvedValue(mockWorkspaces)

      renderWithProviders('/')

      await waitFor(() => {
        expect(screen.getByText('Workspaces')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText('#1 workspace1')).toBeInTheDocument()
        expect(screen.getByText('#2 workspace2')).toBeInTheDocument()
      })
    })

    it('shows loading state while fetching workspaces', () => {
      vi.mocked(api.api.getWorkspaces).mockImplementation(
        () => new Promise(() => {})
      )

      renderWithProviders('/')

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('shows "No workspaces yet" when workspaces array is empty', async () => {
      vi.mocked(api.api.getWorkspaces).mockResolvedValue([])

      renderWithProviders('/')

      await waitFor(() => {
        expect(screen.getByText('No workspaces yet')).toBeInTheDocument()
      })
    })
  })

  describe('TasksPage (/workspaces/:workspaceId)', () => {
    it('renders tasks list for a workspace', async () => {
      vi.mocked(api.api.getWorkspaces).mockResolvedValue(mockWorkspaces)
      vi.mocked(api.api.getTasks).mockResolvedValue(mockTasks)
      vi.mocked(api.api.getStats).mockResolvedValue(mockStats)

      renderWithProviders('/workspaces/1')

      await waitFor(() => {
        expect(screen.getByText('Tasks')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText('#1 Test Task 1')).toBeInTheDocument()
        expect(screen.getByText('#2 Test Task 2')).toBeInTheDocument()
      })

      expect(screen.getByText('Back to Workspaces')).toBeInTheDocument()
    })

    it('renders stats cards when stats are available', async () => {
      vi.mocked(api.api.getWorkspaces).mockResolvedValue(mockWorkspaces)
      vi.mocked(api.api.getTasks).mockResolvedValue(mockTasks)
      vi.mocked(api.api.getStats).mockResolvedValue(mockStats)

      renderWithProviders('/workspaces/1')

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument() // tasks total
      })

      expect(screen.getByText(/1 active, 1 done/)).toBeInTheDocument()
    })

    it('shows "No tasks yet" when tasks array is empty', async () => {
      vi.mocked(api.api.getWorkspaces).mockResolvedValue(mockWorkspaces)
      vi.mocked(api.api.getTasks).mockResolvedValue([])
      vi.mocked(api.api.getStats).mockResolvedValue(mockStats)

      renderWithProviders('/workspaces/1')

      await waitFor(() => {
        expect(screen.getByText('No tasks yet')).toBeInTheDocument()
      })
    })
  })

  describe('TaskDetailPage (/workspaces/:workspaceId/tasks/:taskId)', () => {
    it('renders task detail with todos and actions', async () => {
      vi.mocked(api.api.getWorkspaces).mockResolvedValue(mockWorkspaces)
      vi.mocked(api.api.getTask).mockResolvedValue(mockTaskDetail)

      renderWithProviders('/workspaces/1/tasks/1')

      await waitFor(() => {
        expect(screen.getByText('#1 Test Task 1')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText('#1 Test Todo 1')).toBeInTheDocument()
        expect(screen.getByText('#1 Test Action 1')).toBeInTheDocument()
      })

      expect(screen.getByText('Back to Tasks')).toBeInTheDocument()
    })

    it('shows task status and priority badges', async () => {
      vi.mocked(api.api.getWorkspaces).mockResolvedValue(mockWorkspaces)
      vi.mocked(api.api.getTask).mockResolvedValue(mockTaskDetail)

      renderWithProviders('/workspaces/1/tasks/1')

      await waitFor(() => {
        expect(screen.getAllByText('active').length).toBeGreaterThan(0)
        expect(screen.getAllByText('high').length).toBeGreaterThan(0)
      })
    })

    it('shows "No todos yet" when todos array is empty', async () => {
      vi.mocked(api.api.getWorkspaces).mockResolvedValue(mockWorkspaces)
      vi.mocked(api.api.getTask).mockResolvedValue({
        ...mockTaskDetail,
        todos: [],
      })

      renderWithProviders('/workspaces/1/tasks/1')

      await waitFor(() => {
        expect(screen.getByText('No todos yet')).toBeInTheDocument()
      })
    })

    it('renders action checkboxes correctly', async () => {
      vi.mocked(api.api.getWorkspaces).mockResolvedValue(mockWorkspaces)
      vi.mocked(api.api.getTask).mockResolvedValue(mockTaskDetail)

      renderWithProviders('/workspaces/1/tasks/1')

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox')
        expect(checkboxes.length).toBeGreaterThan(0)
        expect(checkboxes[0]).toBeChecked() // First action is done
      })
    })
  })
})
