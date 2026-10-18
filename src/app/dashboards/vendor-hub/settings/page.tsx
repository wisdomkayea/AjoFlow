"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { useNotifier } from "@/components/ui/ToastNotification";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { apiFetch } from "@/lib/api-client";
import type { SessionUser } from "@/types";
import {
  ArrowLeft,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  FileText,
  Lock,
  Plus,
  Shield,
  Trash2,
  UserCircle2,
  Users,
} from "lucide-react";

interface SessionPayload {
  session: SessionUser | null;
}

interface PolicyTemplate {
  id: string;
  name: string;
  content: string;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface WalletWithdrawal {
  id: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string | null;
  status: "COMPLETED" | "FAILED";
  createdAt: string;
}

interface WalletData {
  totalRevenue: number;
  walletBalance: number;
  withdrawals: WalletWithdrawal[];
}

interface SavedBankAccount {
  key: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

type SettingsSectionKey =
  | "OVERVIEW"
  | "ACCOUNT"
  | "SECURITY"
  | "BUSINESS"
  | "AGREEMENTS"
  | "PAYMENT_METHODS"
  | "NOTIFICATIONS"
  | "SUBSCRIPTION";

interface AgreementForm {
  name: string;
  category: string;
  description: string;
  paymentTerms: string;
  depositRules: string;
  latePaymentPolicy: string;
  ownershipTransfer: string;
  refundPolicy: string;
  possessionPolicy: string;
  gracePeriod: string;
  additionalNotes: string;
}

const emptyAgreementForm: AgreementForm = {
  name: "",
  category: "",
  description: "",
  paymentTerms: "",
  depositRules: "",
  latePaymentPolicy: "",
  ownershipTransfer: "",
  refundPolicy: "",
  possessionPolicy: "",
  gracePeriod: "",
  additionalNotes: "",
};

function naira(n: number | string) {
  return `N${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function maskAccountNumber(value: string) {
  if (!value) return "";
  const tail = value.slice(-4);
  return `****${tail}`;
}

function roleLabel(role: SessionUser["role"]) {
  if (role === "VENDOR") return "Business Owner";
  if (role === "ADMIN") return "Admin";
  if (role === "MEMBER") return "Member";
  return "Customer";
}

function toAgreementForm(template: PolicyTemplate): AgreementForm {
  const lines = template.content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const category = lines[0]?.replace(/^Category:\s*/i, "") ?? "";
  const description = lines[1]?.replace(/^Description:\s*/i, "") ?? "";
  const paymentTerms = lines[2]?.replace(/^Payment Terms:\s*/i, "") ?? "";
  const depositRules = lines[3]?.replace(/^Deposit Rules:\s*/i, "") ?? "";
  const latePaymentPolicy =
    lines[4]?.replace(/^Late Payment Policy:\s*/i, "") ?? "";
  const ownershipTransfer =
    lines[5]?.replace(/^Ownership Transfer:\s*/i, "") ?? "";
  const refundPolicy = lines[6]?.replace(/^Refund Policy:\s*/i, "") ?? "";
  const possessionPolicy =
    lines[7]?.replace(/^Possession Policy:\s*/i, "") ?? "";
  const gracePeriod = lines[8]?.replace(/^Grace Period:\s*/i, "") ?? "";
  const additionalNotes = lines[9]?.replace(/^Additional Notes:\s*/i, "") ?? "";

  return {
    name: template.name,
    category,
    description,
    paymentTerms,
    depositRules,
    latePaymentPolicy,
    ownershipTransfer,
    refundPolicy,
    possessionPolicy,
    gracePeriod,
    additionalNotes,
  };
}

function agreementToContent(form: AgreementForm) {
  const rows = [
    `Category: ${form.category.trim() || "General"}`,
    `Description: ${form.description.trim()}`,
    `Payment Terms: ${form.paymentTerms.trim()}`,
    `Deposit Rules: ${form.depositRules.trim()}`,
    `Late Payment Policy: ${form.latePaymentPolicy.trim()}`,
    `Ownership Transfer: ${form.ownershipTransfer.trim()}`,
    `Refund Policy: ${form.refundPolicy.trim()}`,
    `Possession Policy: ${form.possessionPolicy.trim()}`,
    `Grace Period: ${form.gracePeriod.trim()}`,
    `Additional Notes: ${form.additionalNotes.trim()}`,
  ];

  return rows.join("\n");
}

function splitTemplatePreview(content: string) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [key, ...valueParts] = line.split(":");
      return {
        key: key.trim(),
        value: valueParts.join(":").trim(),
      };
    });
}

function SettingsOverview({
  goTo,
}: {
  goTo: (section: SettingsSectionKey) => void;
}) {
  const groups = [
    {
      heading: "Account",
      items: [
        {
          key: "ACCOUNT" as const,
          icon: UserCircle2,
          title: "Account Settings",
          subtitle: "Manage your personal and bank account information.",
        },
        {
          key: "SECURITY" as const,
          icon: Shield,
          title: "Security",
          subtitle: "Keep your kreddt account secure",
        },
      ],
    },
    {
      heading: "Business",
      items: [
        {
          key: "BUSINESS" as const,
          icon: Building2,
          title: "Business Profile",
          subtitle: "Manage your business information and verification",
        },
        {
          key: "AGREEMENTS" as const,
          icon: FileText,
          title: "Payment Agreements",
          subtitle:
            "Manage the terms customers accept when buying on installment",
        },
        {
          key: "PAYMENT_METHODS" as const,
          icon: CreditCard,
          title: "Payment Methods",
          subtitle: "Manage how customers can pay you",
        },
      ],
    },
    {
      heading: "Preferences",
      items: [
        {
          key: "NOTIFICATIONS" as const,
          icon: Bell,
          title: "Notifications",
          subtitle: "Choose how you receive updates on kreddt",
        },
      ],
    },
    {
      heading: "Billing",
      items: [
        {
          key: "SUBSCRIPTION" as const,
          icon: CreditCard,
          title: "Subscription",
          subtitle: "Manage your kreddt plan",
        },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.heading}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink/45">
            {group.heading}
          </p>
          <Card className="overflow-hidden">
            {group.items.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={() => goTo(item.key)}
                className={`flex w-full items-center justify-between px-4 py-4 text-left transition hover:bg-canvas/40 ${
                  index < group.items.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="rounded-full bg-gold-200/50 p-2">
                    <item.icon className="h-4 w-4 text-gold-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {item.title}
                    </p>
                    <p className="text-xs text-ink/55">{item.subtitle}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink/45" />
              </button>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}

function VendorSettingsContent({ session }: { session: SessionUser }) {
  const [section, setSection] = useState<SettingsSectionKey>("OVERVIEW");

  const [templates, setTemplates] = useState<PolicyTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(
    null,
  );
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );
  const [agreementForm, setAgreementForm] =
    useState<AgreementForm>(emptyAgreementForm);

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: "" });
  const [bankDetailsEditMode, setBankDetailsEditMode] = useState(false);
  const [selectedPayoutAccountKey, setSelectedPayoutAccountKey] = useState("");

  const [profileForm, setProfileForm] = useState({
    fullName: session.name,
    phone: "+234",
    email: session.email,
  });
  const [bankForm, setBankForm] = useState({
    bankName: "",
    accountNumber: "",
    accountName: session.name,
  });
  const [businessForm, setBusinessForm] = useState({
    businessName: `${session.name} Ventures`,
    businessType: "Gadgets & Accessories",
    description:
      "Affordable quality products with flexible installment options for everyday customers.",
    social: "@kreddtvendor",
    website: "www.kreddt.com",
    cacNumber: "",
    registeredName: "",
    verificationDate: "",
    tinNumber: "",
  });
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [notifyForm, setNotifyForm] = useState({
    emailAlerts: true,
    smsAlerts: false,
    paymentReminders: true,
    weeklySummary: true,
  });

  const { presentError, success } = useNotifier();

  const sectionTitle = useMemo(() => {
    if (section === "ACCOUNT") return "Account Settings";
    if (section === "SECURITY") return "Security Settings";
    if (section === "BUSINESS") return "Business";
    if (section === "AGREEMENTS") return "Payment Agreements";
    if (section === "PAYMENT_METHODS") return "Payment Methods";
    if (section === "NOTIFICATIONS") return "Notifications";
    if (section === "SUBSCRIPTION") return "Subscription";
    return "Settings";
  }, [section]);

  const sectionSubtitle = useMemo(() => {
    if (section === "ACCOUNT")
      return "Manage your personal account information";
    if (section === "SECURITY") return "Keep your kreddt account secure";
    if (section === "BUSINESS")
      return "Manage your business information and verification";
    if (section === "AGREEMENTS")
      return "Create reusable agreement templates with versioning";
    if (section === "PAYMENT_METHODS")
      return "Manage your withdrawal account and wallet payouts";
    if (section === "NOTIFICATIONS")
      return "Choose how and when kreddt should notify you";
    if (section === "SUBSCRIPTION")
      return "Manage billing plan, usage limits and renewal details";
    return "Preferences for how kreddt works for you";
  }, [section]);

  const savedBankAccounts = useMemo(() => {
    const accountMap = new Map<string, SavedBankAccount>();

    if (bankForm.bankName.trim() && bankForm.accountNumber.trim()) {
      const key = `${bankForm.bankName.trim().toLowerCase()}|${bankForm.accountNumber.trim()}|${bankForm.accountName.trim().toLowerCase()}`;
      accountMap.set(key, {
        key,
        bankName: bankForm.bankName.trim(),
        accountNumber: bankForm.accountNumber.trim(),
        accountName: bankForm.accountName.trim() || session.name,
      });
    }

    if (wallet) {
      for (const withdrawal of wallet.withdrawals) {
        const key = `${withdrawal.bankName.trim().toLowerCase()}|${withdrawal.accountNumber.trim()}|${(withdrawal.accountName ?? "").trim().toLowerCase()}`;
        if (!accountMap.has(key)) {
          accountMap.set(key, {
            key,
            bankName: withdrawal.bankName,
            accountNumber: withdrawal.accountNumber,
            accountName: withdrawal.accountName || session.name,
          });
        }
      }
    }

    return Array.from(accountMap.values());
  }, [
    bankForm.accountName,
    bankForm.accountNumber,
    bankForm.bankName,
    session.name,
    wallet,
  ]);

  const agreementFormValid = useMemo(() => {
    const required = [
      agreementForm.name,
      agreementForm.description,
      agreementForm.paymentTerms,
      agreementForm.depositRules,
      agreementForm.latePaymentPolicy,
      agreementForm.ownershipTransfer,
      agreementForm.refundPolicy,
      agreementForm.possessionPolicy,
      agreementForm.gracePeriod,
    ];
    return required.every((value) => value.trim().length >= 3);
  }, [agreementForm]);

  const loadTemplates = useCallback(() => {
    setLoadingTemplates(true);
    apiFetch<PolicyTemplate[]>("/api/policy-templates")
      .then((data) => setTemplates(data))
      .catch((error) => presentError(error, "Could not load policy templates"))
      .finally(() => setLoadingTemplates(false));
  }, [presentError]);

  const loadWallet = useCallback(() => {
    setLoadingWallet(true);
    apiFetch<WalletData>("/api/wallet")
      .then((data) => {
        setWallet(data);
        const recent = data.withdrawals[0];
        if (recent) {
          setBankForm((current) => ({
            ...current,
            bankName: current.bankName || recent.bankName,
            accountNumber: current.accountNumber || recent.accountNumber,
            accountName:
              current.accountName || recent.accountName || session.name,
          }));
        }
      })
      .catch((error) => presentError(error, "Could not load wallet details"))
      .finally(() => setLoadingWallet(false));
  }, [presentError, session.name]);

  useEffect(() => {
    if (section === "AGREEMENTS") {
      loadTemplates();
    }
    if (section === "PAYMENT_METHODS") {
      loadWallet();
    }
  }, [section, loadTemplates, loadWallet]);

  useEffect(() => {
    if (section !== "PAYMENT_METHODS") return;
    if (savedBankAccounts.length === 0) {
      setSelectedPayoutAccountKey("");
      return;
    }

    setSelectedPayoutAccountKey((current) => {
      if (
        current &&
        savedBankAccounts.some((account) => account.key === current)
      ) {
        return current;
      }
      return savedBankAccounts[0].key;
    });
  }, [savedBankAccounts, section]);

  async function saveAgreementTemplate() {
    if (!agreementFormValid || savingTemplate) return;

    setSavingTemplate(true);
    try {
      const payload = {
        name: agreementForm.name.trim(),
        content: agreementToContent(agreementForm),
      };

      if (editingTemplateId) {
        await apiFetch(`/api/policy-templates/${editingTemplateId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        success("Template successfully updated.");
      } else {
        await apiFetch("/api/policy-templates", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        success("Template successfully created.");
      }

      setAgreementForm(emptyAgreementForm);
      setEditingTemplateId(null);
      loadTemplates();
    } catch (error) {
      presentError(error, "Could not save template");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function removeAgreementTemplate(id: string) {
    if (savingTemplate || deletingTemplateId) return;

    setDeletingTemplateId(id);
    try {
      await apiFetch(`/api/policy-templates/${id}`, { method: "DELETE" });
      if (editingTemplateId === id) {
        setEditingTemplateId(null);
        setAgreementForm(emptyAgreementForm);
      }
      success("Template deleted.");
      loadTemplates();
    } catch (error) {
      presentError(error, "Could not delete template");
    } finally {
      setDeletingTemplateId(null);
    }
  }

  async function submitWithdrawal() {
    if (!wallet || submittingWithdrawal) return;

    const selectedAccount = savedBankAccounts.find(
      (account) => account.key === selectedPayoutAccountKey,
    );

    if (!selectedAccount) {
      presentError(
        new Error("No payout account selected"),
        "Select a payout account",
      );
      return;
    }

    const amount = Number(withdrawForm.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      presentError(new Error("Enter a valid amount"), "Invalid amount");
      return;
    }

    if (amount > wallet.walletBalance) {
      presentError(
        new Error("Withdrawal amount exceeds available wallet balance"),
        "Amount exceeds wallet balance",
      );
      return;
    }

    setSubmittingWithdrawal(true);
    try {
      await apiFetch("/api/wallet/withdrawals", {
        method: "POST",
        body: JSON.stringify({
          amount,
          bankName: selectedAccount.bankName,
          accountNumber: selectedAccount.accountNumber,
          accountName: selectedAccount.accountName || undefined,
        }),
      });

      success("Withdrawal request recorded.");
      setWithdrawForm((current) => ({ ...current, amount: "" }));
      loadWallet();
    } catch (error) {
      presentError(error, "Could not process withdrawal");
    } finally {
      setSubmittingWithdrawal(false);
    }
  }

  function saveAccountSettings() {
    success("Account settings updated.");
  }

  function saveBusinessProfile() {
    success("Business profile saved.");
  }

  function updatePassword() {
    if (
      !securityForm.currentPassword ||
      !securityForm.newPassword ||
      !securityForm.confirmNewPassword
    ) {
      presentError(
        new Error("All fields are required"),
        "Incomplete security form",
      );
      return;
    }

    if (securityForm.newPassword.length < 6) {
      presentError(
        new Error("Password too short"),
        "Use at least 6 characters",
      );
      return;
    }

    if (securityForm.newPassword !== securityForm.confirmNewPassword) {
      presentError(
        new Error("Password mismatch"),
        "New passwords do not match",
      );
      return;
    }

    success("Password updated.");
    setSecurityForm({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
  }

  function saveNotifications() {
    success("Notification preferences saved.");
  }

  function saveBankDetails() {
    if (!bankForm.bankName.trim() || !bankForm.accountNumber.trim()) {
      presentError(
        new Error("Bank and account number are required"),
        "Incomplete bank details",
      );
      return;
    }

    setBankDetailsEditMode(false);
    success("Bank details updated.");
  }

  function BackButton() {
    if (section === "OVERVIEW") return null;
    return (
      <button
        type="button"
        onClick={() => setSection("OVERVIEW")}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink/70 hover:bg-canvas/40"
        aria-label="Back to settings overview"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="space-y-6">

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <BackButton />
          <div>
            <h2 className="text-2xl font-semibold text-ink">{sectionTitle}</h2>
            <p className="mt-1 text-sm text-ink/55">{sectionSubtitle}</p>
          </div>
        </div>

        {section === "OVERVIEW" && <SettingsOverview goTo={setSection} />}

        {section === "ACCOUNT" && (
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-canvas/70 text-base font-semibold text-ink">
                  {session.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-base font-semibold text-ink">
                    {session.name}
                  </p>
                  <p className="text-sm text-ink/55">
                    Vendor ID: KRD-{session.sub.slice(-6).toUpperCase()}
                  </p>
                  <Badge tone="active">{roleLabel(session.role)}</Badge>
                </div>
              </div>
            </Card>

            <Card>
              <CardBody className="p-5">
                <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <p className="text-lg font-semibold text-ink">
                      Personal Data
                    </p>
                    <p className="text-xs text-ink/50">
                      Information associated with your kreddt account
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Full Name
                    </label>
                    <Input
                      value={profileForm.fullName}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          fullName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Phone Number
                    </label>
                    <Input
                      value={profileForm.phone}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={profileForm.email}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <Button onClick={saveAccountSettings}>Save</Button>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {section === "SECURITY" && (
          <div className="mx-auto w-full max-w-lg">
            <Card>
              <CardBody className="p-5">
                <p className="text-lg font-semibold text-ink">
                  Update Credential
                </p>
                <p className="mt-1 text-xs text-ink/50">
                  Information associated with your kreddt account
                </p>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Current Password
                    </label>
                    <Input
                      type="password"
                      value={securityForm.currentPassword}
                      onChange={(event) =>
                        setSecurityForm((current) => ({
                          ...current,
                          currentPassword: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      New Password
                    </label>
                    <Input
                      type="password"
                      value={securityForm.newPassword}
                      onChange={(event) =>
                        setSecurityForm((current) => ({
                          ...current,
                          newPassword: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Confirm New Password
                    </label>
                    <Input
                      type="password"
                      value={securityForm.confirmNewPassword}
                      onChange={(event) =>
                        setSecurityForm((current) => ({
                          ...current,
                          confirmNewPassword: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <Button className="mt-5 w-full" onClick={updatePassword}>
                  Update Password
                </Button>
              </CardBody>
            </Card>
          </div>
        )}

        {section === "BUSINESS" && (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas/60">
                  <Building2 className="h-4 w-4 text-ink/60" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {businessForm.businessName}
                  </p>
                  <p className="text-xs text-ink/55">
                    Recommended 512x512px PNG or SVG, max 5MB.
                  </p>
                </div>
                <Badge tone="active">Business Owner</Badge>
              </div>
            </Card>

            <Card>
              <CardBody className="p-5">
                <div className="mb-4 border-b border-line pb-3">
                  <p className="text-lg font-semibold text-ink">
                    Business Information
                  </p>
                  <p className="text-xs text-ink/50">
                    Information associated with your kreddt account
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Business Name
                    </label>
                    <Input
                      value={businessForm.businessName}
                      onChange={(event) =>
                        setBusinessForm((current) => ({
                          ...current,
                          businessName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Business Type
                    </label>
                    <Input
                      value={businessForm.businessType}
                      onChange={(event) =>
                        setBusinessForm((current) => ({
                          ...current,
                          businessType: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Description
                    </label>
                    <textarea
                      value={businessForm.description}
                      onChange={(event) =>
                        setBusinessForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      className="h-24 w-full rounded-md border border-line bg-gold-50/50 px-3 py-2 text-sm text-ink placeholder:text-ink/35 focus:border-forest-400 focus:outline-none focus:ring-2 focus:ring-forest-300"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Social
                    </label>
                    <Input
                      value={businessForm.social}
                      onChange={(event) =>
                        setBusinessForm((current) => ({
                          ...current,
                          social: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Website
                    </label>
                    <Input
                      value={businessForm.website}
                      onChange={(event) =>
                        setBusinessForm((current) => ({
                          ...current,
                          website: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="p-5">
                <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <p className="text-lg font-semibold text-ink">
                      Business Verification & Credentials
                    </p>
                    <p className="text-xs text-ink/50">
                      Information associated with your kreddt account
                    </p>
                  </div>
                  <Badge tone="completed">Verified</Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      CAC Number
                    </label>
                    <Input
                      value={businessForm.cacNumber}
                      onChange={(event) =>
                        setBusinessForm((current) => ({
                          ...current,
                          cacNumber: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Registered Entity/Legal Name
                    </label>
                    <Input
                      value={businessForm.registeredName}
                      onChange={(event) =>
                        setBusinessForm((current) => ({
                          ...current,
                          registeredName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Verification Date
                    </label>
                    <Input
                      value={businessForm.verificationDate}
                      onChange={(event) =>
                        setBusinessForm((current) => ({
                          ...current,
                          verificationDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      TIN Number
                    </label>
                    <Input
                      value={businessForm.tinNumber}
                      onChange={(event) =>
                        setBusinessForm((current) => ({
                          ...current,
                          tinNumber: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <Button onClick={saveBusinessProfile}>Save</Button>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {section === "AGREEMENTS" && (
          <div className="space-y-4">
            <Card>
              <CardBody className="space-y-4 p-5">
                <p className="text-lg font-semibold text-ink">
                  Payment Agreement
                </p>
                <p className="-mt-2 text-xs text-ink/50">
                  Create a reusable payment agreement template
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Template Name
                    </label>
                    <Input
                      value={agreementForm.name}
                      onChange={(event) =>
                        setAgreementForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Furniture Agreement"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Category
                    </label>
                    <Input
                      value={agreementForm.category}
                      onChange={(event) =>
                        setAgreementForm((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                      placeholder="Phones and Accessories"
                    />
                  </div>
                </div>

                {[
                  [
                    "Description",
                    "description",
                    "Short summary of what this template covers",
                  ],
                  [
                    "Payment Terms",
                    "paymentTerms",
                    "e.g. buyer agrees to pay in equal monthly payments",
                  ],
                  [
                    "Deposit Rules",
                    "depositRules",
                    "e.g. a non-refundable deposit is required before delivery",
                  ],
                  [
                    "Late Payment Policy",
                    "latePaymentPolicy",
                    "e.g. late fee applies after 3 days overdue",
                  ],
                  [
                    "Ownership Transfer",
                    "ownershipTransfer",
                    "e.g. ownership passes after final payment",
                  ],
                  [
                    "Refund Policy",
                    "refundPolicy",
                    "e.g. deposits are non-refundable",
                  ],
                  [
                    "Possession Policy",
                    "possessionPolicy",
                    "e.g. possession rules while plan is active",
                  ],
                  [
                    "Grace Period",
                    "gracePeriod",
                    "e.g. 5 days grace period before late fees",
                  ],
                  ["Additional Notes", "additionalNotes", "Optional notes"],
                ].map(([label, key, placeholder]) => (
                  <div key={String(key)}>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      {label}
                    </label>
                    <textarea
                      value={agreementForm[key as keyof AgreementForm]}
                      onChange={(event) =>
                        setAgreementForm((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                      placeholder={String(placeholder)}
                      className="h-24 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/35 focus:border-forest-400 focus:outline-none focus:ring-2 focus:ring-forest-300"
                    />
                  </div>
                ))}

                <div className="flex justify-end gap-2 border-t border-line pt-3">
                  {editingTemplateId && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingTemplateId(null);
                        setAgreementForm(emptyAgreementForm);
                      }}
                      disabled={savingTemplate}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    onClick={saveAgreementTemplate}
                    disabled={!agreementFormValid || savingTemplate}
                  >
                    {savingTemplate
                      ? "Saving..."
                      : editingTemplateId
                        ? "Update Template"
                        : "Save Template"}
                  </Button>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-ink">
                      Saved Templates
                    </p>
                    <p className="text-xs text-ink/50">
                      Reusable agreement templates
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingTemplateId(null);
                      setAgreementForm(emptyAgreementForm);
                    }}
                  >
                    <Plus className="h-4 w-4" /> Add Template
                  </Button>
                </div>

                {loadingTemplates ? (
                  <SkeletonText lines={8} />
                ) : templates.length === 0 ? (
                  <p className="text-sm text-ink/55">
                    No templates created yet.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {templates.map((template) => {
                      const preview = splitTemplatePreview(template.content);
                      const category =
                        preview.find(
                          (item) => item.key.toLowerCase() === "category",
                        )?.value || "General";

                      return (
                        <Card
                          key={template.id}
                          className="overflow-hidden border-line/80"
                        >
                          <CardBody className="space-y-3 p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-ink">
                                  {template.name}
                                </p>
                                <p className="text-xs text-ink/50">
                                  {category}
                                </p>
                              </div>
                              <Badge tone="neutral">v1</Badge>
                            </div>

                            <div className="space-y-1 border-t border-line pt-2 text-xs text-ink/60">
                              <p className="line-clamp-2">
                                {preview.find(
                                  (item) =>
                                    item.key.toLowerCase() === "description",
                                )?.value || "No description"}
                              </p>
                              <div className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                <span>
                                  {template.usageCount ?? 0} Customers Using
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock3 className="h-3.5 w-3.5" />
                                <span>
                                  Updated {formatDate(template.updatedAt)}
                                </span>
                              </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setEditingTemplateId(template.id);
                                  setAgreementForm(toAgreementForm(template));
                                }}
                                disabled={
                                  savingTemplate ||
                                  deletingTemplateId === template.id
                                }
                              >
                                Edit
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() =>
                                  removeAgreementTemplate(template.id)
                                }
                                disabled={
                                  savingTemplate ||
                                  deletingTemplateId === template.id
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {deletingTemplateId === template.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </Button>
                            </div>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {section === "PAYMENT_METHODS" && (
          <div className="space-y-4">
            <Card>
              <CardBody className="p-5">
                <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <p className="text-lg font-semibold text-ink">
                      Bank Details
                    </p>
                    <p className="text-xs text-ink/50">
                      Add the account where you want to receive payments from
                      your customers
                    </p>
                  </div>
                  {!bankDetailsEditMode ? (
                    <button
                      type="button"
                      className="text-xs font-medium text-ink/65 hover:text-ink"
                      onClick={() => setBankDetailsEditMode(true)}
                    >
                      Edit
                    </button>
                  ) : null}
                </div>

                {bankDetailsEditMode ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-ink">
                          Bank
                        </label>
                        <Input
                          value={bankForm.bankName}
                          onChange={(event) =>
                            setBankForm((current) => ({
                              ...current,
                              bankName: event.target.value,
                            }))
                          }
                          placeholder="Guaranty Trust Bank"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-ink">
                          Account Number
                        </label>
                        <Input
                          value={bankForm.accountNumber}
                          onChange={(event) =>
                            setBankForm((current) => ({
                              ...current,
                              accountNumber: event.target.value,
                            }))
                          }
                          placeholder="0000000000"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-ink">
                          Account Name
                        </label>
                        <Input
                          value={bankForm.accountName}
                          onChange={(event) =>
                            setBankForm((current) => ({
                              ...current,
                              accountName: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setBankDetailsEditMode(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={saveBankDetails}>Save</Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-ink/50">Bank</p>
                      <p className="mt-1 text-lg font-semibold text-ink">
                        {bankForm.bankName || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-ink/50">Account Number</p>
                      <p className="mt-1 text-lg font-semibold text-ink">
                        {bankForm.accountNumber
                          ? maskAccountNumber(bankForm.accountNumber)
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-ink/50">Account Name</p>
                      <p className="mt-1 text-lg font-semibold text-ink">
                        {bankForm.accountName || "-"}
                      </p>
                    </div>

                    <Badge tone="completed">Verified</Badge>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody className="p-5">
                <div className="mb-4 border-b border-line pb-3">
                  <p className="text-lg font-semibold text-ink">
                    Wallet Payout
                  </p>
                  <p className="text-xs text-ink/50">
                    Move wallet funds to your bank account
                  </p>
                </div>

                {loadingWallet ? (
                  <SkeletonText lines={4} />
                ) : !wallet ? (
                  <p className="text-sm text-ink/55">
                    Could not load wallet data.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-forest-600 p-4 text-white">
                      <p className="text-xs text-white/80">
                        Available to withdraw
                      </p>
                      <p className="mt-1 text-2xl font-semibold">
                        {naira(wallet.walletBalance)}
                      </p>
                      <p className="mt-1 text-xs text-white/70">
                        Lifetime revenue {naira(wallet.totalRevenue)}
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-1">
                        <label className="mb-1.5 block text-sm font-medium text-ink">
                          Amount
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={wallet.walletBalance}
                          value={withdrawForm.amount}
                          onChange={(event) =>
                            setWithdrawForm((current) => ({
                              ...current,
                              amount: event.target.value,
                            }))
                          }
                          placeholder="0.00"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="mb-1.5 block text-sm font-medium text-ink">
                          Pay To
                        </label>
                        <select
                          value={selectedPayoutAccountKey}
                          onChange={(event) =>
                            setSelectedPayoutAccountKey(event.target.value)
                          }
                          className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink focus:border-forest-400 focus:outline-none focus:ring-2 focus:ring-forest-300"
                        >
                          {savedBankAccounts.length === 0 && (
                            <option value="">No saved account details</option>
                          )}
                          {savedBankAccounts.map((account) => (
                            <option key={account.key} value={account.key}>
                              {account.bankName} ·{" "}
                              {maskAccountNumber(account.accountNumber)} ·{" "}
                              {account.accountName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {selectedPayoutAccountKey && (
                      <div className="rounded-md border border-line bg-canvas/30 px-3 py-3 text-sm">
                        {(() => {
                          const selected = savedBankAccounts.find(
                            (account) =>
                              account.key === selectedPayoutAccountKey,
                          );
                          if (!selected)
                            return (
                              <p className="text-ink/50">
                                No payout account selected.
                              </p>
                            );
                          return (
                            <div className="space-y-1 text-ink/70">
                              <p>
                                <span className="text-ink/50">Bank:</span>{" "}
                                {selected.bankName}
                              </p>
                              <p>
                                <span className="text-ink/50">
                                  Account Number:
                                </span>{" "}
                                {maskAccountNumber(selected.accountNumber)}
                              </p>
                              <p>
                                <span className="text-ink/50">
                                  Account Name:
                                </span>{" "}
                                {selected.accountName}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        onClick={submitWithdrawal}
                        disabled={
                          submittingWithdrawal ||
                          wallet.walletBalance <= 0 ||
                          !selectedPayoutAccountKey
                        }
                      >
                        {submittingWithdrawal ? "Processing..." : "Withdraw"}
                      </Button>
                    </div>

                    <div className="space-y-2 border-t border-line pt-3">
                      <p className="text-sm font-semibold text-ink">
                        Recent withdrawals
                      </p>
                      {wallet.withdrawals.length === 0 ? (
                        <p className="text-xs text-ink/55">
                          No withdrawals yet.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {wallet.withdrawals.slice(0, 5).map((withdrawal) => (
                            <div
                              key={withdrawal.id}
                              className="flex items-center justify-between rounded-md border border-line px-3 py-2"
                            >
                              <div>
                                <p className="text-sm text-ink">
                                  {withdrawal.bankName} ·{" "}
                                  {maskAccountNumber(withdrawal.accountNumber)}
                                </p>
                                <p className="text-xs text-ink/50">
                                  {formatDate(withdrawal.createdAt)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-ink">
                                  {naira(withdrawal.amount)}
                                </p>
                                <Badge
                                  tone={
                                    withdrawal.status === "COMPLETED"
                                      ? "completed"
                                      : "missed"
                                  }
                                >
                                  {withdrawal.status.toLowerCase()}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {section === "NOTIFICATIONS" && (
          <Card>
            <CardBody className="space-y-4 p-5">
              <p className="text-lg font-semibold text-ink">
                Notification Preferences
              </p>
              <p className="-mt-2 text-xs text-ink/50">
                Tune when and where you receive account and payment updates
              </p>

              {[
                [
                  "emailAlerts",
                  "Email Alerts",
                  "Receive important account and payout updates by email",
                ],
                ["smsAlerts", "SMS Alerts", "Get critical alerts by SMS"],
                [
                  "paymentReminders",
                  "Payment Reminders",
                  "Notify customers and vendor on upcoming dues",
                ],
                [
                  "weeklySummary",
                  "Weekly Summary",
                  "Get weekly business and collection report",
                ],
              ].map(([key, title, subtitle]) => (
                <label
                  key={String(key)}
                  className="flex items-start justify-between gap-3 rounded-md border border-line px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{title}</p>
                    <p className="text-xs text-ink/55">{subtitle}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyForm[key as keyof typeof notifyForm]}
                    onChange={(event) =>
                      setNotifyForm((current) => ({
                        ...current,
                        [key]: event.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-line text-forest-600 focus:ring-forest-300"
                  />
                </label>
              ))}

              <div className="flex justify-end">
                <Button onClick={saveNotifications}>Save Preferences</Button>
              </div>
            </CardBody>
          </Card>
        )}

        {section === "SUBSCRIPTION" && (
          <Card>
            <CardBody className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                <div>
                  <p className="text-lg font-semibold text-ink">
                    Kreddt Growth Plan
                  </p>
                  <p className="text-xs text-ink/55">
                    Renews monthly · Next billing date: 30 Oct 2026
                  </p>
                </div>
                <Badge tone="active">Active</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-line p-3">
                  <p className="text-xs text-ink/50">Monthly Fee</p>
                  <p className="mt-1 text-lg font-semibold text-ink">
                    {naira(15000)}
                  </p>
                </div>
                <div className="rounded-md border border-line p-3">
                  <p className="text-xs text-ink/50">
                    Installment Plans Allowed
                  </p>
                  <p className="mt-1 text-lg font-semibold text-ink">
                    Unlimited
                  </p>
                </div>
                <div className="rounded-md border border-line p-3">
                  <p className="text-xs text-ink/50">Support</p>
                  <p className="mt-1 text-lg font-semibold text-ink">
                    Priority
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    success("Plan management will be enabled in billing phase.")
                  }
                >
                  Manage Plan
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    success("Invoice export will be enabled in billing phase.")
                  }
                >
                  Download Last Invoice
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

function FallbackContent() {
  return (
    <Card className="p-6">
      <p className="text-sm text-ink/50">
        This page is available to vendor accounts.
      </p>
    </Card>
  );
}

export default function VendorSettingsPage() {
  return (
    <DashboardShell>
      {(session: SessionUser) =>
        session.role === "VENDOR" ? (
          <VendorSettingsContent session={session} />
        ) : (
          <FallbackContent />
        )
      }
    </DashboardShell>
  );
}
