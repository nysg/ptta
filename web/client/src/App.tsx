import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, type Project, type ProjectHierarchy } from './lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'

function App() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  })

  const { data: projectDetail } = useQuery<ProjectHierarchy>({
    queryKey: ['project', selectedProjectId],
    queryFn: () => api.getProject(selectedProjectId!),
    enabled: selectedProjectId !== null,
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
          {selectedProjectId && (
            <Button variant="outline" onClick={() => setSelectedProjectId(null)}>
              Back to Projects
            </Button>
          )}
        </div>

        {stats && (
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.projects.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.projects.active} active, {stats.projects.completed} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.tasks.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.tasks.inProgress} in progress, {stats.tasks.done} done
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subtasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.subtasks.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.subtasks.todo} todo, {stats.subtasks.done} done
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedProjectId && projectDetail ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl">#{projectDetail.id} {projectDetail.title}</CardTitle>
                    {projectDetail.description && (
                      <CardDescription className="mt-2 text-base">
                        {projectDetail.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      projectDetail.status === 'active' ? 'bg-blue-100 text-blue-700' :
                      projectDetail.status === 'completed' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {projectDetail.status}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      projectDetail.priority === 'high' ? 'bg-red-100 text-red-700' :
                      projectDetail.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {projectDetail.priority}
                    </span>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">Tasks</h2>

              {projectDetail.tasks && projectDetail.tasks.length > 0 ? (
                <div className="space-y-4">
                  {projectDetail.tasks.map((task) => (
                    <Card key={task.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl">#{task.id} {task.title}</CardTitle>
                            {task.description && (
                              <CardDescription className="mt-2">
                                {task.description}
                              </CardDescription>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              task.status === 'todo' ? 'bg-gray-100 text-gray-700' :
                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
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
                      {task.subtasks && task.subtasks.length > 0 && (
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Subtasks:</p>
                            <ul className="space-y-1">
                              {task.subtasks.map((subtask) => (
                                <li key={subtask.id} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={subtask.status === 'done'}
                                    readOnly
                                    className="rounded"
                                  />
                                  <span className={subtask.status === 'done' ? 'line-through text-muted-foreground' : ''}>
                                    #{subtask.id} {subtask.title}
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
                    <p className="text-muted-foreground">No tasks yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">Projects</h2>

            {projects && projects.length > 0 ? (
              <div className="grid gap-4">
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>#{project.id} {project.title}</CardTitle>
                          {project.description && (
                            <CardDescription className="mt-2">
                              {project.description}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            project.status === 'active' ? 'bg-blue-100 text-blue-700' :
                            project.status === 'completed' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {project.status}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            project.priority === 'high' ? 'bg-red-100 text-red-700' :
                            project.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {project.priority}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">No projects yet</p>
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
