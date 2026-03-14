"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserPlus, ShieldWarning, ListDashes, ChartLineUp } from "@phosphor-icons/react";

export function QuickActions() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href="/dashboard/add-patient">
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <UserPlus size={14} weight="bold" />
          Add Patient
        </Button>
      </Link>
      <Link href="/dashboard/alerts">
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <ShieldWarning size={14} weight="bold" />
          Alert Center
        </Button>
      </Link>
      <Link href="/dashboard/patients">
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <ListDashes size={14} weight="bold" />
          All Patients
        </Button>
      </Link>
      <Link href="/dashboard/ongoing">
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <ChartLineUp size={14} weight="bold" />
          Ongoing Cases
        </Button>
      </Link>
    </div>
  );
}

