"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { aiSearchResources } from "./actions";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/Badge";
import { AI_DISCLAIMER } from "@/lib/ai";

interface ResourceItem {
  id: string;
  name: string;
  type: string;
  category: string;
  location: string;
  description: string;
  image: string | null;
  department: string;
  depositCredits: number;
  creditCostPerHour: number;
  maxHoursPerBooking: number;
  status: string;
  isEligible: boolean;
  missingCerts: string[];
}

interface ResourceListClientProps {
  resources: ResourceItem[];
  userRole?: string;
  canCreateResource?: boolean;
}

export function ResourceListClient({
  resources,
  userRole,
  canCreateResource = false,
}: ResourceListClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [onlyEligible, setOnlyEligible] = useState<boolean>(false);

  // AI search state
  const [aiQuery, setAiQuery] = useState("");
  const [aiMatches, setAiMatches] = useState<
    Array<{ resourceId: string; score: number; reason: string }>
  >([]);
  const [isAiSearching, startAiTransition] = useTransition();

  const handleAiSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    startAiTransition(async () => {
      const res = await aiSearchResources(aiQuery);
      if (res.success) {
        setAiMatches(res.matches);
      }
    });
  };

  const clearAiSearch = () => {
    setAiQuery("");
    setAiMatches([]);
  };

  const filteredResources = resources.filter((r) => {
    // If AI matches are active, prioritize or highlight them
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (selectedType !== "ALL" && r.type !== selectedType) {
      return false;
    }

    if (selectedDept !== "ALL" && r.department !== selectedDept) {
      return false;
    }

    if (onlyEligible && !r.isEligible) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Campus Equipment & Space Registry
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Discover, check eligibility, and schedule high-demand university assets across labs and studios.
          </p>
        </div>

        {canCreateResource && (
          <Link
            href="/resources/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors shrink-0"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            List New Resource
          </Link>
        )}
      </div>

      {/* AI Smart Search Box */}
      <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 p-5 rounded-2xl border border-blue-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
              AI Intelligent Resource Matcher
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900 border border-amber-300">
            {AI_DISCLAIMER}
          </span>
        </div>

        <form onSubmit={handleAiSearch} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="Describe your project (e.g. 'I need to 3D print a robotics gear housing' or 'High frame rate video capture for biomechanics')"
              className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
            {aiQuery && (
              <button
                type="button"
                onClick={clearAiSearch}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isAiSearching || !aiQuery.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-50 transition-colors shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isAiSearching ? (
              <span>Analyzing...</span>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span>AI Smart Match</span>
              </>
            )}
          </button>
        </form>

        {/* AI Results Banner */}
        {aiMatches.length > 0 && (
          <div className="mt-4 pt-4 border-t border-blue-200/60">
            <p className="text-xs font-semibold text-blue-900 mb-2">
              Top AI Matches for &quot;{aiQuery}&quot;:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {aiMatches.map((match) => {
                const targetRes = resources.find((r) => r.id === match.resourceId);
                if (!targetRes) return null;

                return (
                  <Link
                    key={match.resourceId}
                    href={`/resources/${match.resourceId}`}
                    className="p-3 bg-white/90 rounded-xl border border-blue-200 hover:border-blue-400 hover:shadow-xs transition-all flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">
                          {targetRes.name}
                        </span>
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                          {match.score}% fit
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-snug">
                        {match.reason}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-blue-600 shrink-0 mt-0.5">
                      View →
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Keyword Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by equipment name, category, or location..."
              className="w-full px-3.5 py-2 pl-9 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-3"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Types</option>
            <option value="EQUIPMENT">Equipment</option>
            <option value="SPACE">Spaces & Rooms</option>
            <option value="TOOL">Tools & Meters</option>
            <option value="COMPUTE">Compute Clusters</option>
          </select>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Media">Media Arts</option>
            <option value="Biology">Biology</option>
            <option value="Library">Library</option>
          </select>
        </div>

        {/* Eligibility Checkbox Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900 select-none">
            <input
              type="checkbox"
              checked={onlyEligible}
              onChange={(e) => setOnlyEligible(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
            />
            <span>Show only resources I am currently eligible to reserve</span>
          </label>
          <span className="text-xs text-slate-400">
            Showing {filteredResources.length} of {resources.length} items
          </span>
        </div>
      </div>

      {/* Resource Cards Grid */}
      {filteredResources.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500 text-base font-medium">
            No campus resources match your filter criteria.
          </p>
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedType("ALL");
              setSelectedDept("ALL");
              setOnlyEligible(false);
            }}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
          >
            Reset all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res) => {
            return (
              <div
                key={res.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col group"
              >
                {/* Image Banner */}
                <div className="relative h-44 bg-slate-100 overflow-hidden">
                  <img
                    src={res.image || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"}
                    alt={res.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                    <span className="bg-white/95 backdrop-blur-xs text-slate-800 text-[11px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
                      {res.type}
                    </span>
                    <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-semibold px-2 py-0.5 rounded-md shadow-2xs">
                      {res.department}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {userRole && (
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md shadow-2xs backdrop-blur-xs flex items-center gap-1 ${
                          res.isEligible
                            ? "bg-emerald-600/90 text-white"
                            : "bg-rose-600/90 text-white"
                        }`}
                        title={res.isEligible ? "You are eligible to book" : res.missingCerts[0] || "Prerequisites needed"}
                      >
                        {res.isEligible ? "Eligible ✅" : "Ineligible ❌"}
                      </span>
                    )}
                    <StatusBadge status={res.status} />
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <span>{res.category}</span>
                      <span>•</span>
                      <span className="truncate">{res.location}</span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-lg leading-snug group-hover:text-blue-600 transition-colors">
                      {res.name}
                    </h3>

                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {res.description}
                    </p>
                  </div>

                  {/* Footer details & Eligibility */}
                  <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="text-slate-600">
                        <span className="font-bold text-slate-900 text-sm">
                          {res.creditCostPerHour === 0 ? "Free" : `${res.creditCostPerHour} credits`}
                        </span>
                        {res.creditCostPerHour > 0 && <span className="text-slate-400">/hr</span>}
                      </div>
                      <div className="text-slate-500 text-right">
                        <span>Deposit: <strong>{res.depositCredits}</strong> cr</span>
                      </div>
                    </div>

                    {/* Eligibility Pill */}
                    <div className="text-xs">
                      {res.isEligible ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-medium">
                          <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          <span>You are eligible to book</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-medium">
                          <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                          </svg>
                          <span className="truncate">
                            {res.missingCerts[0] || "Prerequisites needed"}
                          </span>
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/resources/${res.id}`}
                      className="block text-center w-full py-2 bg-slate-900 group-hover:bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                    >
                      View Details & Reserve →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
