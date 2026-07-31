"use client";

import type { ReactNode } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Fade,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast,
} from "@repo/ui";
import { Icon, Search01Icon } from "@repo/ui/icons";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium">{title}</h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
      <Separator />
    </section>
  );
}

export function DesignSystemGallery() {
  return (
    <TooltipProvider>
      <div className="space-y-10">
        <Fade>
          <Section title="Button & badge">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destructive</Button>
            <Badge>Open</Badge>
            <Badge variant="secondary">Draft</Badge>
          </Section>
        </Fade>

        <Section title="Inputs">
          <div className="grid w-full max-w-md gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ds-email">Email</Label>
              <Input id="ds-email" type="email" placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ds-notes">Notes</Label>
              <Textarea id="ds-notes" placeholder="Optional notes" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="ds-terms" />
              <Label htmlFor="ds-terms">Accept terms</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="ds-alerts" />
              <Label htmlFor="ds-alerts">Email alerts</Label>
            </div>
          </div>
        </Section>

        <Section title="Select & menus">
          <Select defaultValue="pro">
            <SelectTrigger className="w-44" aria-label="Plan">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>Actions</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Popover>
            <PopoverTrigger render={<Button variant="outline" />}>Popover</PopoverTrigger>
            <PopoverContent>Supporting details go here.</PopoverContent>
          </Popover>
          <Dialog>
            <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm</DialogTitle>
                <DialogDescription>This is a Base UI dialog from `@repo/ui`.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button>Continue</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Section>

        <Section title="Tabs & card">
          <Tabs defaultValue="overview" className="w-full max-w-lg">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Invoice INV-100</CardTitle>
                  <CardDescription>$250.00 due</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="activity">No activity yet.</TabsContent>
          </Tabs>
        </Section>

        <Section title="Icons, tooltip & toast">
          <Icon icon={Search01Icon} aria-label="Search" className="size-5" />
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" />}>Hint</TooltipTrigger>
            <TooltipContent>Helpful tip</TooltipContent>
          </Tooltip>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              toast("Saved", { description: "Your changes are stored." });
            }}
          >
            Show toast
          </Button>
        </Section>
      </div>
    </TooltipProvider>
  );
}
