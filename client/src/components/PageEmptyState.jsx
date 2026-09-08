import { FolderGit2Icon, GitPullRequestIcon, ShieldAlertIcon } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

const icons = {
  repo: FolderGit2Icon,
  pulls: GitPullRequestIcon,
  findings: ShieldAlertIcon,
}

export function PageEmptyState({
  icon = "repo",
  title,
  description,
  children,
}) {
  const Icon = icons[icon] ?? FolderGit2Icon

  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {children}
    </Empty>
  )
}
