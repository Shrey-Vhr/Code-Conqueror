import React from "react";
import { requireAuth, isStaff } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createResourceAction } from "../resourceActions";

export default async function NewResourcePage() {
  const session = await requireAuth();

  if (!isStaff(session.role)) {
    redirect("/resources");
  }

  const trainings = await prisma.training.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/resources" className="hover:text-blue-600">
          ← All Resources
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">List New Resource</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="border-b border-slate-100 pb-5 mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            List Campus Asset for Sharing
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Register university equipment, lab spaces, or compute nodes for campus reservation.
          </p>
        </div>

        <form action={async (formData) => {
          "use server";
          const res = await createResourceAction(formData);
          if (res.success && res.resourceId) {
            redirect(`/resources/${res.resourceId}`);
          }
        }} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Asset Name *
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Formlabs Form 4 SLA 3D Printer"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Resource Type *
              </label>
              <select
                name="type"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EQUIPMENT">EQUIPMENT</option>
                <option value="SPACE">SPACE</option>
                <option value="TOOL">TOOL</option>
                <option value="COMPUTE">COMPUTE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Department *
              </label>
              <select
                name="department"
                defaultValue={session.department}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Engineering">Engineering</option>
                <option value="Media">Media Arts</option>
                <option value="Biology">Biology</option>
                <option value="Library">Library</option>
                <option value="Campus">Campus-wide</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Category *
              </label>
              <input
                type="text"
                name="category"
                required
                placeholder="e.g. Rapid Prototyping"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Physical Location / Room *
              </label>
              <input
                type="text"
                name="location"
                required
                placeholder="e.g. Makerspace Room 104"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Description & Rules */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Description & Specifications *
              </label>
              <textarea
                name="description"
                rows={3}
                required
                placeholder="Provide specs, model details, software compatibilities..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Safety Rules & Operating Guidelines
              </label>
              <textarea
                name="rules"
                rows={2}
                placeholder="Required PPE, prohibited materials, clean-up protocol..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Image URL (Unsplash or direct asset)
              </label>
              <input
                type="url"
                name="image"
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Pricing & Policy Limits */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Credit Cost / Hr
              </label>
              <input
                type="number"
                name="creditCostPerHour"
                defaultValue={5}
                min={0}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Deposit Credits
              </label>
              <input
                type="number"
                name="depositCredits"
                defaultValue={10}
                min={0}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Max Hours / Booking
              </label>
              <input
                type="number"
                name="maxHoursPerBooking"
                defaultValue={4}
                min={1}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Max Bookings / Wk
              </label>
              <input
                type="number"
                name="maxBookingsPerWeek"
                defaultValue={3}
                min={1}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          {/* Prerequisites */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Mandatory Training Certification
              </label>
              <select
                name="trainingId"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No training required (Open access)</option>
                {trainings.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.department})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Role Requirement
              </label>
              <select
                name="requiredRole"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any authenticated campus user</option>
                <option value="RESEARCHER">RESEARCHER role only</option>
                <option value="STUDENT">STUDENT role only</option>
              </select>
            </div>
          </div>

          {/* Supervision Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
              <input
                type="checkbox"
                name="requiresSupervision"
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
              />
              <span>Requires in-person technician or staff supervision</span>
            </label>
          </div>

          {/* Submit Buttons */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              href="/resources"
              className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer"
            >
              Publish Resource to Registry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
