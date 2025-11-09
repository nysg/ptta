import { Routes, Route, useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, type Task, type TaskHierarchy, type Workspace } from './lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'

function WorkspacesPage() {
  const navigate = useNavigate()

  const { data: workspaces, isLoading: isLoadingWorkspaces } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: () => api.getWorkspaces(),
  })

  if (isLoadingWorkspaces) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">ptta</h1>
            <p className="text-muted-foreground">AI-first Task Management</p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Workspaces</h2>

          {workspaces && workspaces.length > 0 ? (
            <div className="grid gap-4">
              {workspaces.map((workspace) => (
                <Card
                  key={workspace.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/workspaces/${workspace.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>#{workspace.id} {workspace.name}</CardTitle>
                        <CardDescription className="mt-2">
                          {workspace.path}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(workspace.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No workspaces yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function TasksPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()

  const { data: workspaces } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: () => api.getWorkspaces(),
  })

  const workspace = workspaces?.find(w => w.id === Number(workspaceId))

  const { data: tasks, isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ['tasks', workspace?.path],
    queryFn: () => api.getTasks(workspace?.path || undefined),
    enabled: !!workspace,
  })

  const { data: stats } = useQuery({
    queryKey: ['stats', workspace?.path],
    queryFn: () => api.getStats(workspace?.path || undefined),
    enabled: !!workspace,
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">ptta</h1>
            <p className="text-muted-foreground">AI-first Task Management</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Workspaces
          </Button>
        </div>

        {stats && (
          <div className="grid gap-2 md:grid-cols-3 mb-4">
            <Card>
              <CardContent className="py-2 px-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Tasks</span>
                  <span className="font-bold">{stats.tasks.total}</span>
                  <span className="text-muted-foreground text-xs">{stats.tasks.active} active, {stats.tasks.completed} done</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-2 px-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Todos</span>
                  <span className="font-bold">{stats.todos.total}</span>
                  <span className="text-muted-foreground text-xs">{stats.todos.inProgress} in progress, {stats.todos.done} done</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-2 px-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Actions</span>
                  <span className="font-bold">{stats.actions.total}</span>
                  <span className="text-muted-foreground text-xs">{stats.actions.todo} todo, {stats.actions.done} done</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Tasks</h2>

          {isLoadingTasks ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">Loading tasks...</p>
              </CardContent>
            </Card>
          ) : tasks && tasks.length > 0 ? (
            <div className="grid gap-4">
              {tasks.map((task) => (
                <Card
                  key={task.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/workspaces/${workspaceId}/tasks/${task.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>#{task.id} {task.title}</CardTitle>
                        {task.description && (
                          <CardDescription className="mt-2">
                            {task.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          task.status === 'active' ? 'bg-blue-100 text-blue-700' :
                          task.status === 'completed' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {task.status}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          task.priority === 'high' ? 'bg-red-100 text-red-700' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(task.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No tasks yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function TaskDetailPage() {
  const { workspaceId, taskId } = useParams<{ workspaceId: string; taskId: string }>()
  const navigate = useNavigate()

  const { data: workspaces } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: () => api.getWorkspaces(),
  })

  const workspace = workspaces?.find(w => w.id === Number(workspaceId))

  const { data: taskDetail } = useQuery<TaskHierarchy>({
    queryKey: ['task', taskId, workspace?.path],
    queryFn: () => api.getTask(Number(taskId), workspace?.path || undefined),
    enabled: !!workspace && !!taskId,
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">ptta</h1>
            <p className="text-muted-foreground">AI-first Task Management</p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/workspaces/${workspaceId}`)}>
            Back to Tasks
          </Button>
        </div>

        {taskDetail && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl">#{taskDetail.id} {taskDetail.title}</CardTitle>
                    {taskDetail.description && (
                      <CardDescription className="mt-2 text-base">
                        {taskDetail.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      taskDetail.status === 'active' ? 'bg-blue-100 text-blue-700' :
                      taskDetail.status === 'completed' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {taskDetail.status}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      taskDetail.priority === 'high' ? 'bg-red-100 text-red-700' :
                      taskDetail.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {taskDetail.priority}
                    </span>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">Todos</h2>

              {taskDetail.todos && taskDetail.todos.length > 0 ? (
                <div className="space-y-4">
                  {taskDetail.todos.map((todo) => (
                    <Card key={todo.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl">#{todo.id} {todo.title}</CardTitle>
                            {todo.description && (
                              <CardDescription className="mt-2">
                                {todo.description}
                              </CardDescription>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              todo.status === 'todo' ? 'bg-gray-100 text-gray-700' :
                              todo.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {todo.status}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              todo.priority === 'high' ? 'bg-red-100 text-red-700' :
                              todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {todo.priority}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      {todo.actions && todo.actions.length > 0 && (
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Actions:</p>
                            <ul className="space-y-1">
                              {todo.actions.map((action) => (
                                <li key={action.id} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={action.status === 'done'}
                                    readOnly
                                    className="rounded"
                                  />
                                  <span className={action.status === 'done' ? 'line-through text-muted-foreground' : ''}>
                                    #{action.id} {action.title}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <p className="text-muted-foreground">No todos yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<WorkspacesPage />} />
      <Route path="/workspaces/:workspaceId" element={<TasksPage />} />
      <Route path="/workspaces/:workspaceId/tasks/:taskId" element={<TaskDetailPage />} />
    </Routes>
  )
}

export default App
