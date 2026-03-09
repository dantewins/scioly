"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  MoreVertical,
  FileText,
  MessageSquare,
  Folder,
  Check,
  X,
} from "lucide-react";

import { User, Ticket, UsersFour, ChartLineUp } from "phosphor-react"

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Course = {
  id: string;
  title: string;
  subtitle: string;
  schoolLine: string;
  heroClass?: string;
  notif?: number;
};

type TodoItem = {
  id: string;
  title: string;
  course: string;
  points?: string;
  due: string;
};

type FeedbackItem = {
  id: string;
  title: string;
  course: string;
  score: string;
};

const navItems = [
  { label: "Account", icon: User, href: "#", avatar: true },
  { label: "Events", icon: Ticket, href: "#", active: true },
  { label: "Team", icon: UsersFour, href: "#" },
  { label: "Statistics", icon: ChartLineUp, href: "#" }
];

const courses: Course[] = [
  {
    id: "chem",
    title: "Experimental design",
    subtitle: "25-26 USF States",
    schoolLine: "2026-Academic Village High School Ca…",
    heroClass: "bg-gradient-to-br from-red-700/80 to-red-400/60",
    notif: 1,
  },
  {
    id: "csp",
    title: "Circuit lab",
    subtitle: "25-26 USF States",
    schoolLine: "2026-Academic Village High School Ca…",
    heroClass: "bg-gradient-to-br from-orange-700/80 to-orange-400/60",
  },
  {
    id: "apush",
    title: "Remote sensing",
    subtitle: "25-26 USF States",
    schoolLine: "2026-Academic Village High School Ca…",
    heroClass: "bg-gradient-to-br from-slate-800/80 to-slate-500/60",
    notif: 2,
  },
];

const todos: TodoItem[] = [
  { id: "t1", title: "Labs/Activities - Modern Physics", course: "AP Physics 2-Invernizzi-06", due: "Mar 2 at 7am" },
  { id: "t2", title: "Unit 7 Progress Check", course: "AP CHEM-Hernandez-Davis-01", due: "Mar 2 at 11:30pm" },
  { id: "t3", title: "7.12 Th Common Ion Effect & practice questions 3/2", course: "AP CHEM-Hernandez-Davis-01", points: "100 points", due: "Mar 3 at 10:30am" },
  { id: "t4", title: "How well do you know the Create Performance Task?", course: "AP COMP SCI PRIN-Harris 25-26", points: "10 points", due: "Mar 4 at 9am" },
  { id: "t5", title: "Progress Check UNIT 15 - MCQ", course: "AP Physics 2-Invernizzi-06", due: "Mar 4 at 11:30pm" },
];

const feedback: FeedbackItem[] = [
  { id: "f1", title: "Unit 6 Exam LEQ Portion", course: "AP U.S. HIST-Tate-2526", score: "8.5 out of 10" },
  { id: "f2", title: "Unit 6 Graphic Organizers", course: "AP U.S. HIST-Tate-2526", score: "48 out of 50" },
  { id: "f3", title: "Unit 6 Vocabulary: Gilded Age Key Terms", course: "AP U.S. HIST-Tate-2526", score: "52 out of 55" },
];

function Sidebar() {
  return (
    <aside className="hidden md:flex w-[76px] border-r bg-[#2d3b45] text-white">
      <div className="flex w-full flex-col items-center py-3">
        <nav className="mt-1 flex w-full flex-col items-center gap-1 px-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "w-full rounded-md px-2 py-2 flex flex-col items-center gap-1 text-[11px] leading-none hover:bg-white/10",
                item.active && "bg-white/15",
                item.label === "Account" && "mb-1" // small spacing like Canvas
              )}
            >
              {item.avatar ? (
                <div className="h-9 w-9 rounded-full bg-white/10 ring-1 ring-white/15" />
              ) : (
                <item.icon className="h-5 w-5" />
              )}

              <span className="select-none">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function CourseCard({ course }: { course: Course }) {
  return (
    <Card className="overflow-hidden rounded-md border shadow-sm">
      <div className={cn("relative h-[120px] w-full", course.heroClass ?? "bg-muted")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 bg-black/10 text-white hover:bg-black/20"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Open</DropdownMenuItem>
            <DropdownMenuItem>View grades</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardHeader className="space-y-1 px-3 py-3">
        <Link
          href="#"
          className="text-[12.5px] font-semibold text-red-600 hover:underline"
        >
          {course.title}
        </Link>
        <Link href="#" className="text-[13px] text-blue-700 hover:underline">
          {course.subtitle}
        </Link>
        <p className="text-[11px] text-muted-foreground">{course.schoolLine}</p>
      </CardHeader>

      <Separator />

      <CardContent className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <FileText className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Folder className="h-4 w-4" />
          </Button>
        </div>

        {course.notif ? (
          <Badge variant="secondary" className="rounded-full px-2">
            {course.notif}
          </Badge>
        ) : (
          <span className="text-[11px] text-muted-foreground" />
        )}
      </CardContent>
    </Card>
  );
}

function RightRail() {
  return (
    <aside className="hidden xl:flex w-[340px] border-l bg-background">
      <ScrollArea className="h-[calc(100vh-0px)] w-full">
        <div className="p-4">
          {/* To Do */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">To Do</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-2 space-y-3">
            {todos.map((t) => (
              <div key={t.id} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <Link href="#" className="text-[12.5px] text-blue-700 hover:underline">
                    {t.title}
                  </Link>
                  <div className="text-[11px] text-muted-foreground">{t.course}</div>
                  {t.points && <div className="text-[11px] text-muted-foreground">{t.points}</div>}
                  <div className="text-[11px] text-muted-foreground">{t.due}</div>
                </div>
              </div>
            ))}
            <Link href="#" className="text-[12px] text-blue-700 hover:underline">
              Show All
            </Link>
          </div>

          <Separator className="my-4" />

          {/* Recent Feedback */}
          <h3 className="text-sm font-semibold">Recent Feedback</h3>
          <div className="mt-2 space-y-3">
            {feedback.map((f) => (
              <div key={f.id} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                <div className="min-w-0">
                  <Link href="#" className="text-[12.5px] text-blue-700 hover:underline">
                    {f.title}
                  </Link>
                  <div className="text-[11px] text-muted-foreground">{f.course}</div>
                  <div className="text-[11px] text-muted-foreground">{f.score}</div>
                </div>
              </div>
            ))}
            <Link href="#" className="text-[12px] text-blue-700 hover:underline">
              6 more in the past two weeks…
            </Link>

            <Button variant="outline" className="mt-2 w-full">
              View Grades
            </Button>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}

export default function CanvasDashboardReplica() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <Sidebar />

        {/* Main */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between px-6 py-4">
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>

          <Separator />

          <div className="px-6 py-4">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {courses.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          </div>
        </main>

        {/* <RightRail /> */}
      </div>
    </div>
  );
}