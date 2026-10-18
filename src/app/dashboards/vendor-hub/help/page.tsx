"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";

export default function VendorHelpPage() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <PageHeader
          title="Help and Support"
          subtitle="Reach out if you need a hand"
        />
        <Card>
          <CardBody className="p-6">
            <p className="text-sm text-ink/60">
              Need help? Email{" "}
              <a
                href="mailto:support@kreddt.dev"
                className="text-forest-600 underline"
              >
                support@kreddt.dev
              </a>
              .
            </p>
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  );
}
