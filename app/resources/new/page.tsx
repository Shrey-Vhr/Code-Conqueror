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
        <Link href="/resources" className="hover:text-indigo-600 transition-colors font-medium">
          ← All Resources
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-bold">List New Resource</span>
      </div>

      <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-8 sm:p-10 space-y-6">
        <div className="border-b border-slate-100 pb-5 mb-2">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            List Campus Asset for Sharing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Asset Name *
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Formlabs Form 4 SLA 3D Printer"
                className="w-full px-4 py-2.5 rounded-full border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-2xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Resource Type *
              </label>
              <select
                name="type"
                required
                className="w-full px-4 py-2.5 rounded-full border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-2xs font-medium cursor-pointer"
              >
                <option value="EQUIPMENT">EQUIPMENT</option>
                <option value="SPACE">SPACE</option>
                <option value="TOOL">TOOL</option>
                <option value="COMPUTE">COMPUTE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Department *
              </label>
              <select
                name="department"
                defaultValue={session.department}
                className="w-full px-4 py-2.5 rounded-full border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-2xs font-medium cursor-pointer"
              >
                <option value="Engineering">Engineering</option>
                <option value="Media">Media Arts</option>
                <option value="Biology">Biology</option>
                <option value="Library">Library</option>
                <option value="Campus">Campus-wide</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <input
                type="text"
                name="category"
                required
                placeholder="e.g. Rapid Prototyping"
                className="w-full px-4 py-2.5 rounded-full border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-2xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Physical Location / Room *
              </label>
              <input
                type="text"
                name="location"
                required
                placeholder="e.g. Makerspace Room 104"
                className="w-full px-4 py-2.5 rounded-full border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-2xs font-medium"
              />
            </div>
          </div>

          {/* Description & Rules */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Description & Specifications *
              </label>
              <textarea
                name="description"
                rows={3}
                required
                placeholder="Provide specs, model details, software compatibilities..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Safety Rules & Operating Guidelines
              </label>
              <textarea
                name="rules"
                rows={2}
                placeholder="Required PPE, prohibited materials, clean-up protocol..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Image URL (Unsplash or direct asset)
              </label>
              <input
                type="url"
                name="image"
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full px-4 py-2.5 rounded-full border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-2xs"
              />
            </div>
          </div>

          {/* Pricing & Policy Limits */}
          <div className="pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Credit Cost / Hr
              </label>
              <input
                type="number"
                name="creditCostPerHour"
                defaultValue={5}
                min={0}
                className="w-full px-4 py-2 rounded-full border border-slate-200 text-xs sm:text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Deposit Credits
              </label>
              <input
                type="number"
                name="depositCredits"
                defaultValue={10}
                min={0}
                className="w-full px-4 py-2 rounded-full border border-slate-200 text-xs sm:text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Max Hours / Booking
              </label>
              <input
                type="number"
                name="maxHoursPerBooking"
                defaultValue={4}
                min={1}
                className="w-full px-4 py-2 rounded-full border border-slate-200 text-xs sm:text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Max Bookings / Wk
              </label>
              <input
                type="number"
                name="maxBookingsPerWeek"
                defaultValue={3}
                min={1}
                className="w-full px-4 py-2 rounded-full border border-slate-200 text-xs sm:text-sm font-medium"
              />
            </div>
          </div>

          {/* Prerequisites */}
          <div className="pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mandatory Training Certification
              </label>
              <select
                name="trainingId"
                className="w-full px-4 py-2.5 rounded-full border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-2xs font-medium cursor-pointer"
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Role Requirement
              </label>
              <select
                name="requiredRole"
                className="w-full px-4 py-2.5 rounded-full border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-2xs font-medium cursor-pointer"
              >
                <option value="">Any authenticated campus user</option>
                <option value="RESEARCHER">RESEARCHER role only</option>
                <option value="STUDENT">STUDENT role only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Department Restriction
              </label>
              <select
                name="requiredDepartment"
                className="w-full px-4 py-2.5 rounded-full border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-2xs font-medium cursor-pointer"
              >
                <option value="">No department restriction (Open to all)</option>
                <option value="Engineering">Engineering only</option>
                <option value="Media">Media Arts only</option>
                <option value="Biology">Biology only</option>
                <option value="Computer Science">Computer Science only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Minimum Credit Balance Required
              </label>
              <input
                type="number"
                name="minCredits"
                placeholder="e.g. 20 (optional)"
                min={0}
                className="w-full px-4 py-2.5 rounded-full border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-2xs font-medium"
              />
            </div>
          </div>

          {/* Operating Hours Windows */}
          <div className="pt-5 border-t border-slate-100 space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Operating Availability Schedule (JSON)
            </label>
            <input
              type="text"
              name="availabilityWindows"
              defaultValue='[{"dayOfWeek":1,"start":"08:00","end":"20:00"},{"dayOfWeek":2,"start":"08:00","end":"20:00"},{"dayOfWeek":3,"start":"08:00","end":"20:00"},{"dayOfWeek":4,"start":"08:00","end":"20:00"},{"dayOfWeek":5,"start":"08:00","end":"20:00"}]'
              className="w-full px-4 py-2.5 rounded-full border border-slate-200 text-xs font-mono"
            />
            <p className="text-[11px] text-slate-400">
              Format: Array of objects with dayOfWeek (0=Sun, 1=Mon... 6=Sat), start (&quot;08:00&quot;), end (&quot;20:00&quot;). Default: Mon-Fri 08:00-20:00.
            </p>
          </div>

          {/* Supervision Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-semibold text-slate-700 select-none">
              <input
                type="checkbox"
                name="requiresSupervision"
                className="rounded text-indigo-600 focus:ring-indigo-400 h-4 w-4 border-slate-300"
              />
              <span>Requires in-person technician or staff supervision</span>
            </label>
          </div>

          {/* Submit Buttons */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              href="/resources"
              className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-full text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="px-7 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-full text-xs font-bold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all cursor-pointer hover:-translate-y-0.5"
            >
              Publish Resource to Registry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
