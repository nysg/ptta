import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, type Task, type TaskHierarchy } from './lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'

function App() {
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
  })

  const { data: taskDetail } = useQuery<TaskHierarchy>({
    queryKey: ['task', selectedTaskId],
    queryFn: () => api.getTask(selectedTaskId!),
    enabled: selectedTaskId !== null,
  })

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.getStats(),
  })

  if (isLoading) {
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
          {selectedTaskId && (
            <Button variant="outline" onClick={() => setSelectedTaskId(null)}>
              Back to Tasks
            </Button>
          )}
        </div>

        {stats && (
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.tasks.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.tasks.active} active, {stats.tasks.completed} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Todos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.todos.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.todos.inProgress} in progress, {stats.todos.done} done
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.actions.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.actions.todo} todo, {stats.actions.done} done
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedTaskId && taskDetail ? (
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
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">Tasks</h2>

            {tasks && tasks.length > 0 ? (
              <div className="grid gap-4">
                {tasks.map((task) => (
                  <Card
                    key={task.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedTaskId(task.id)}
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
        )}
      </div>
    </div>
  )
}

export default App
