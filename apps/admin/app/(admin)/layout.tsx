import Link from 'next/link';
import {
  GraduationCap,
  BookOpen,
  Layers,
  ClipboardList,
  FileText,
  PanelLeft,
  Settings
} from 'lucide-react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { User } from './user';
import Providers from './providers';
import { NavItem } from './nav-item';
import { SearchInput } from './search';

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <main className="flex min-h-screen w-full flex-col bg-muted/40">
        <DesktopNav />
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <MobileNav />
            <AdminBreadcrumb />
            <SearchInput />
            <User />
          </header>
          <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-6 bg-muted/40">
            {children}
          </main>
        </div>
      </main>
    </Providers>
  );
}

function DesktopNav() {
  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
        <Link
          href="/programs"
          className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
        >
          <GraduationCap className="h-4 w-4 transition-all group-hover:scale-110" />
          <span className="sr-only">Academy Enrollment</span>
        </Link>

        <NavItem href="/programs" label="Programs">
          <BookOpen className="h-5 w-5" />
        </NavItem>

        <NavItem href="/batches" label="Batches">
          <Layers className="h-5 w-5" />
        </NavItem>

        <NavItem href="/enrollments" label="Enrollments">
          <ClipboardList className="h-5 w-5" />
        </NavItem>

        <NavItem href="/content" label="Content Library">
          <FileText className="h-5 w-5" />
        </NavItem>
      </nav>
      <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              disabled
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground/50 transition-colors md:h-8 md:w-8 cursor-not-allowed"
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Settings (Coming soon)</TooltipContent>
        </Tooltip>
      </nav>
    </aside>
  );
}

function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="icon" variant="outline" className="sm:hidden">
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="sm:max-w-xs">
        <nav className="grid gap-6 text-lg font-medium">
          <Link
            href="/programs"
            className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
          >
            <GraduationCap className="h-5 w-5 transition-all group-hover:scale-110" />
            <span className="sr-only">Academy Enrollment</span>
          </Link>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2.5">
            Academy Enrollment
          </div>
          <Link
            href="/programs"
            className="flex items-center gap-4 px-2.5 text-foreground hover:text-foreground"
          >
            <BookOpen className="h-5 w-5" />
            Programs
          </Link>
          <Link
            href="/batches"
            className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
          >
            <Layers className="h-5 w-5" />
            Batches
          </Link>
          <Link
            href="/enrollments"
            className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
          >
            <ClipboardList className="h-5 w-5" />
            Enrollments
          </Link>
          <Link
            href="/content"
            className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
          >
            <FileText className="h-5 w-5" />
            Content Library
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function AdminBreadcrumb() {
  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/programs">Academy</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Enrollment Admin</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
