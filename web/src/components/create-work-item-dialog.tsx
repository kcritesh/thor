import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateWorkItem } from '@/hooks/use-work-items'

export function CreateWorkItemDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: string) => void
}) {
  const create = useCreateWorkItem()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError(null)
    create.mutate(
      {
        externalId: String(form.get('externalId')),
        title: String(form.get('title')),
        description: String(form.get('description')),
      },
      {
        onSuccess: ({ item, created }) => {
          if (created) toast.success('Work item added')
          else toast.info(`${item.externalId} already exists. Opened the existing item.`)
          onCreated(item.id)
          onOpenChange(false)
        },
        onError: (err) => setError(err.message),
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setError(null)
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add work item</DialogTitle>
          <DialogDescription>
            Items normally arrive from the CRM. Adding one here goes through the same intake,
            so a repeated reference opens the existing item.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="externalId">CRM reference</Label>
            <Input
              id="externalId"
              name="externalId"
              placeholder="CRM-12345"
              required
              maxLength={100}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Missing income document"
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              placeholder="The applicant has not provided their latest payslip."
              required
              maxLength={5000}
            />
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-failed-soft px-3 py-2 text-sm text-failed">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Add work item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
