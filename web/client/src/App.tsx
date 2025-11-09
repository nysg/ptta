import { useQuery } from '@tanstack/react-query'
import { api, type Project } from './lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'

function App() {
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
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
          <Button>New Project</Button>
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

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Projects</h2>

          {projects && projects.length > 0 ? (
            <div className="grid gap-4">
              {projects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{project.title}</CardTitle>
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
                <p className="text-muted-foreground mb-4">No projects yet</p>
                <Button variant="outline">Create your first project</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
