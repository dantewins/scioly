"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { IconChevronDown, IconEye, IconTrash, IconCaretDown, IconEdit, IconMenuDeep } from "@tabler/icons-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Team = {
  id: string
  name: string
  captains: string[]
  members: {
    name: string
    track?: string
  }[]
}

const initialTeams: Team[] = [
  {
    id: "helium-heads",
    name: "Helium Heads",
    captains: ["Harshita", "Joe", "Valery"],
    members: [
      { name: "Adrian Moreno", track: "B" },
      { name: "Aiden Rupin", track: "B" },
      { name: "Aanya Wadhwa", track: "T" },
      { name: "Aarush Wadhwa", track: "T" },
      { name: "Liam Moore", track: "T/B" },
      { name: "Joe Kahura", track: "T/B" },
      { name: "Rinta Mambayil", track: "T" },
      { name: "Armando Ayla", track: "T" },
    ],
  },
  {
    id: "neon-neurons",
    name: "Neon Neurons",
    captains: ["Nckayla"],
    members: [
      { name: "Steve Jacob", track: "B" },
      { name: "Umer Qureshi", track: "B" },
      { name: "Michael Zhuravlev", track: "T/B" },
      { name: "Eshal Farhatullah", track: "T" },
      { name: "Alex Vermilion", track: "T" },
      { name: "Shankar Kannan", track: "T/B" },
      { name: "Jason Jiang", track: "T/B" },
      { name: "Danny Kim", track: "T" },
    ],
  },
  {
    id: "up-an-atom",
    name: "Up an Atom",
    captains: ["Gregory", "Kaylah"],
    members: [
      { name: "Huda Iqbal", track: "T" },
      { name: "Gabriella Molina", track: "T" },
      { name: "Sarah Pervez", track: "T" },
      { name: "Bianca Gutierrez", track: "B/T" },
      { name: "Pragathi Natarajan", track: "T" },
      { name: "Seff Cotterell", track: "T" },
      { name: "Alexa Rodriguez", track: "T" },
      { name: "Andrew Fernandez", track: "T" },
    ],
  },
  {
    id: "darwins-disciples",
    name: "Darwin’s Disciples",
    captains: ["Alex"],
    members: [
      { name: "Joerge Zaldivar Cabrera", track: "T" },
      { name: "Kristopher Illescas", track: "T" },
      { name: "Christian Melendez", track: "T" },
      { name: "Adia Smith", track: "T" },
      { name: "Jacob Morillo", track: "B" },
      { name: "Jazlyn Ramirez", track: "T" },
      { name: "Julian Gutierrez-Elbers", track: "T" },
      { name: "Joshua Smith", track: "T" },
    ],
  },
  {
    id: "atomic-alphas",
    name: "Atomic Alphas",
    captains: ["Asiya"],
    members: [
      { name: "Laura Liu", track: "T" },
      { name: "Gregory Scala", track: "T" },
      { name: "Philippe Denis", track: "T" },
      { name: "Kaylah Fernandez", track: "T" },
      { name: "Nithin Mathew", track: "T" },
      { name: "Austen Chen", track: "T" },
      { name: "Sophia Dong", track: "T" },
      { name: "Ethan Hidalgo", track: "T" },
    ],
  },
  {
    id: "royal-researchers",
    name: "Royal Researchers",
    captains: ["Caitlin"],
    members: [
      { name: "Caitlin Capiro", track: "T" },
      { name: "Giada Porven", track: "T" },
      { name: "Tyler Dawkins", track: "B" },
      { name: "Shloak Nagineni", track: "B" },
      { name: "Emanuel Zapata", track: "B/T" },
      { name: "Phoenix Mok", track: "T/B" },
      { name: "Rohan Torati", track: "T/B" },
      { name: "Nicolas Ortega", track: "T" },
    ],
  },
  {
    id: "fast-and-curious",
    name: "Fast and Curious",
    captains: ["Shriya", "Gaby"],
    members: [
      { name: "Olivia Grill", track: "T" },
      { name: "Peyton McCarthy", track: "B" },
      { name: "Madison Quallo", track: "T" },
      { name: "Amelia Walcott", track: "T" },
      { name: "Daniela D’Souza", track: "T" },
      { name: "Atharv Agashe", track: "T" },
      { name: "John Abohasen", track: "B" },
      { name: "Claire Lee", track: "T" },
    ],
  },
]

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function parseCaptains(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

export default function TeamsPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>(initialTeams)
  const [query, setQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [formName, setFormName] = useState("")
  const [formCaptains, setFormCaptains] = useState("")

  const totalStudents = useMemo(
    () => teams.reduce((sum, team) => sum + team.members.length, 0),
    [teams]
  )

  const filteredTeams = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return teams

    return teams.filter((team) => {
      const haystack = [
        team.name,
        ...team.captains,
        ...team.members.map((member) => member.name),
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [teams, query])

  const openCreateDialog = () => {
    setEditingTeamId(null)
    setFormName("")
    setFormCaptains("")
    setDialogOpen(true)
  }

  const openEditDialog = (team: Team) => {
    setEditingTeamId(team.id)
    setFormName(team.name)
    setFormCaptains(team.captains.join(", "))
    setDialogOpen(true)
  }

  const handleSaveTeam = () => {
    const trimmedName = formName.trim()
    if (!trimmedName) return

    const captains = parseCaptains(formCaptains)

    if (editingTeamId) {
      setTeams((prev) =>
        prev.map((team) =>
          team.id === editingTeamId
            ? {
              ...team,
              id: slugify(trimmedName),
              name: trimmedName,
              captains,
            }
            : team
        )
      )
    } else {
      const newTeam: Team = {
        id: slugify(trimmedName),
        name: trimmedName,
        captains,
        members: [],
      }

      setTeams((prev) => [newTeam, ...prev])
    }

    setDialogOpen(false)
    setEditingTeamId(null)
    setFormName("")
    setFormCaptains("")
  }

  const handleDeleteTeam = (team: Team) => {
    const confirmed = window.confirm(`Delete "${team.name}"?`)
    if (!confirmed) return

    setTeams((prev) => prev.filter((item) => item.id !== team.id))
  }

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filteredTeams.map((team) => {
          const previewMembers = team.members.slice(0, 3)
          const remainingMembers = Math.max(team.members.length - 3, 0)

          return (
            <Card
              key={team.id}
              className="rounded-md border-border shadow-none transition-colors hover:border-foreground/20 px-2 py-4 hover:cursor-pointer"
            >
              <CardHeader className="space-y-3 px-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{team.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Captain{team.captains.length > 1 ? "s" : ""}:{" "}
                      {team.captains.length ? team.captains.join(", ") : "No captain assigned"}
                    </CardDescription>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="group h-8 w-8 hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent"
                      >
                        <IconCaretDown className="!h-5 !w-5 pointer-events-none transition-transform duration-200 ease-out group-data-[state=open]:rotate-180" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-auto">
                      <DropdownMenuItem onClick={() => router.push(`/teams/${team.id}`)}>
                        <IconEye />
                        View

                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => openEditDialog(team)}>
                        <IconEdit />
                        Edit
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleDeleteTeam(team)}
                      >
                        <IconTrash />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-0 px-2">
                <div className="flex items-center justify-between rounded-xl">
                  <div className="flex items-center gap-2 text-sm">
                    <span>{team.members.length} members</span>
                  </div>

                  <div className="flex items-center">
                    {team.members.slice(0, 5).map((member, index) => (
                      <Avatar
                        key={member.name}
                        className={`h-8 w-8 border-2 border-background ${index === 0 ? "" : "-ml-2"
                          }`}
                      >
                        <AvatarFallback className="text-[10px]">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                    ))}

                    {team.members.length > 5 && (
                      <div className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full
                      bg-muted border-2 border-background bg-background text-[10px] font-medium">
                        +{team.members.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTeamId ? "Edit team" : "Create team"}
            </DialogTitle>
            <DialogDescription>
              Add a team name and captain names separated by commas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team name</Label>
              <Input
                id="team-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Atomic Alphas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-captains">Captains</Label>
              <Input
                id="team-captains"
                value={formCaptains}
                onChange={(e) => setFormCaptains(e.target.value)}
                placeholder="Asiya, Gregory"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTeam}>
              {editingTeamId ? "Save Changes" : "Create Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}