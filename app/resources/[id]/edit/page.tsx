import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageResource } from "@/lib/rbac";
import { updateResourceAction } from "../../resourceActions";

export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAuth();

  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      requirements: true,
    },
  });

  if (!resource) notFound();

  if (!canManageResource(session, { ownerId: resource.ownerId, department: resource.department })) {
    redirect(`/resources/${id}`);
  }

  const trainings = await prisma.training.findMany({
    orderBy: { name: "asc" },
  });

  const existingTrainingId = resource.requirements.find((r) => r.trainingId)?.trainingId || "";
  const existingRole = resource.requirements.find((r) => r.requiredRole)?.requiredRole || "";
  const existingDepartment = resource.requirements.find((r) => r.requiredDepartment)?.requiredDepartment || "";
  const existingMinCredits = resource.requirements.find((r) => r.minCredits !== null)?.minCredits ?? "";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href={`/resources/${resource.id}`} className="hover:text-blue-600">
          ← Back to Resource
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Edit Resource Settings</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="border-b border-slate-100 pb-5 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Edit {resource.name}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Update operational parameters, maintenance status, and mandatory prerequisites.
            </p>
          </div>
        </div>

        <form
          action={async (formData) => {
            "use server";
            const res = await updateResourceAction(resource.id, formData);
            if (res.success) {
              redirect(`/resources/${resource.id}`);
            }
          }}
          className="space-y-6"
        >
          {/* Status and basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Operational Status *
              </label>
              <select
                name="status"
                defaultValue={resource.status}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ACTIVE">ACTIVE (Accepting Reservations)</option>
                <option value="MAINTENANCE">MAINTENANCE (Offline for Calibration/Repairs)</option>
                <option value="RETIRED">RETIRED (Decommissioned)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Asset Name *
              </label>
              <input
                type="text"
                name="name"
                required
                defaultValue={resource.name}
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
                defaultValue={resource.type}
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
                defaultValue={resource.department}
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
                defaultValue={resource.category}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Physical Location *
              </label>
              <input
                type="text"
                name="location"
                required
                defaultValue={resource.location}
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
                defaultValue={resource.description}
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
                defaultValue={resource.rules || ""}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Image URL
              </label>
              <input
                type="url"
                name="image"
                defaultValue={resource.image || ""}
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
                defaultValue={resource.creditCostPerHour}
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
                defaultValue={resource.depositCredits}
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
                defaultValue={resource.maxHoursPerBooking}
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
                defaultValue={resource.maxBookingsPerWeek}
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
                defaultValue={existingTrainingId}
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
                defaultValue={existingRole}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any authenticated campus user</option>
                <option value="RESEARCHER">RESEARCHER role only</option>
                <option value="STUDENT">STUDENT role only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Department Restriction
              </label>
              <select
                name="requiredDepartment"
                defaultValue={existingDepartment}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No department restriction (Open to all)</option>
                <option value="Engineering">Engineering only</option>
                <option value="Media">Media Arts only</option>
                <option value="Biology">Biology only</option>
                <option value="Computer Science">Computer Science only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Minimum Credit Balance Required
              </label>
              <input
                type="number"
                name="minCredits"
                defaultValue={existingMinCredits}
                placeholder="e.g. 20 (optional)"
                min={0}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Operating Hours Windows */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Operating Availability Schedule (JSON)
            </label>
            <input
              type="text"
              name="availabilityWindows"
              defaultValue={resource.availabilityWindows || '[{"dayOfWeek":1,"start":"08:00","end":"20:00"},{"dayOfWeek":2,"start":"08:00","end":"20:00"},{"dayOfWeek":3,"start":"08:00","end":"20:00"},{"dayOfWeek":4,"start":"08:00","end":"20:00"},{"dayOfWeek":5,"start":"08:00","end":"20:00"}]'}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono"
            />
            <p className="text-[11px] text-slate-400">
              Format: Array of objects with dayOfWeek (0=Sun, 1=Mon... 6=Sat), start (&quot;08:00&quot;), end (&quot;20:00&quot;).
            </p>
          </div>

          {/* Supervision Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
              <input
                type="checkbox"
                name="requiresSupervision"
                defaultChecked={resource.requiresSupervision}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
              />
              <span>Requires in-person technician or staff supervision</span>
            </label>
          </div>

          {/* Submit Buttons */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              href={`/resources/${resource.id}`}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
