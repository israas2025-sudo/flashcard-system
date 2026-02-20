"use client";

import React, { useMemo, useState, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import { motion } from "framer-motion";
import { ArrowUp, ArrowDown, Flag } from "lucide-react";

interface CardRow {
  id: string;
  front: string;
  back: string;
  deck: string;
  due: string;
  interval: string;
  ease: number;
  flag: number;
  tags: string[];
  state: "new" | "learning" | "review" | "paused";
}

interface CardTableProps {
  onSelect: (cardId: string) => void;
  onEdit: (card: {
    id: string;
    front: string;
    back: string;
    deck: string;
    tags: string[];
  }) => void;
  selectedCards: Set<string>;
}

const flagColors: Record<number, string> = {
  0: "",
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-green-500",
  4: "bg-blue-500",
  5: "bg-purple-500",
};

const stateColors: Record<string, string> = {
  new: "text-blue-500",
  learning: "text-amber-500",
  review: "text-green-500",
  paused: "text-yellow-600",
};

// Generate mock data
function generateMockCards(count: number): CardRow[] {
  const decks = [
    "Arabic::MSA",
    "Arabic::Egyptian",
    "Quran::Al-Fatiha",
    "Quran::Al-Baqarah",
    "Spanish::Vocabulary",
    "Spanish::Grammar",
    "English::GRE",
  ];
  const states: CardRow["state"][] = ["new", "learning", "review", "paused"];
  const sampleFronts = [
    "كتاب",
    "مدرسة",
    "mariposa",
    "ubiquitous",
    "إزيّك",
    "biblioteca",
    "ephemeral",
    "سلام",
    "amanecer",
    "perspicacious",
    "بِسْمِ اللَّهِ",
    "jardín",
    "magnanimous",
    "قلم",
    "hermoso",
  ];
  const sampleBacks = [
    "book",
    "school",
    "butterfly",
    "everywhere",
    "how are you",
    "library",
    "short-lived",
    "peace",
    "sunrise",
    "astute",
    "In the name of God",
    "garden",
    "generous",
    "pen",
    "beautiful",
  ];
  const tagSets = [
    ["arabic", "vocabulary"],
    ["quran", "memorized"],
    ["spanish", "nature"],
    ["english", "gre"],
    ["egyptian", "greetings"],
    ["arabic", "grammar"],
    ["spanish", "verbs"],
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `card-${i}`,
    front: sampleFronts[i % sampleFronts.length],
    back: sampleBacks[i % sampleBacks.length],
    deck: decks[i % decks.length],
    due: i % 4 === 0 ? "now" : `${Math.floor(Math.random() * 30)}d`,
    interval: `${Math.floor(Math.random() * 365)}d`,
    ease: 1.5 + Math.random() * 1.5,
    flag: i % 10 === 0 ? Math.floor(Math.random() * 5) + 1 : 0,
    tags: tagSets[i % tagSets.length],
    state: states[i % states.length],
  }));
}

const columnHelper = createColumnHelper<CardRow>();

export function CardTable({ onSelect, onEdit, selectedCards }: CardTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    column: string;
  } | null>(null);

  const data = useMemo(() => generateMockCards(200), []);

  const columns = useMemo(
    () => [
      // Checkbox column
      columnHelper.display({
        id: "select",
        header: () => (
          <div className="w-8 flex items-center justify-center">
            <input
              type="checkbox"
              className="w-3.5 h-3.5 rounded border-[var(--surface-3)] text-primary-500 focus:ring-primary-500"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="w-8 flex items-center justify-center">
            <input
              type="checkbox"
              checked={selectedCards.has(row.original.id)}
              onChange={() => onSelect(row.original.id)}
              className="w-3.5 h-3.5 rounded border-[var(--surface-3)] text-primary-500 focus:ring-primary-500"
            />
          </div>
        ),
        size: 40,
      }),
      // Flag column
      columnHelper.accessor("flag", {
        header: () => <Flag className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />,
        cell: ({ getValue }) => {
          const flag = getValue();
          if (!flag) return null;
          return (
            <div
              className={`w-3 h-3 rounded-full ${flagColors[flag]}`}
            />
          );
        },
        size: 36,
      }),
      // Front column
      columnHelper.accessor("front", {
        header: "Front",
        cell: ({ getValue, row }) => {
          const value = getValue();
          if (
            editingCell?.rowId === row.original.id &&
            editingCell?.column === "front"
          ) {
            return (
              <input
                autoFocus
                defaultValue={value}
                onBlur={() => setEditingCell(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape")
                    setEditingCell(null);
                }}
                className="w-full px-1 py-0.5 text-sm bg-[var(--surface-0)] border border-primary-300 rounded outline-none text-[var(--text-primary)]"
              />
            );
          }
          return (
            <span
              onClick={() =>
                setEditingCell({ rowId: row.original.id, column: "front" })
              }
              className="cursor-text text-sm text-[var(--text-primary)] truncate block"
            >
              {value}
            </span>
          );
        },
        size: 200,
      }),
      // Back column
      columnHelper.accessor("back", {
        header: "Back",
        cell: ({ getValue, row }) => {
          const value = getValue();
          if (
            editingCell?.rowId === row.original.id &&
            editingCell?.column === "back"
          ) {
            return (
              <input
                autoFocus
                defaultValue={value}
                onBlur={() => setEditingCell(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape")
                    setEditingCell(null);
                }}
                className="w-full px-1 py-0.5 text-sm bg-[var(--surface-0)] border border-primary-300 rounded outline-none text-[var(--text-primary)]"
              />
            );
          }
          return (
            <span
              onClick={() =>
                setEditingCell({ rowId: row.original.id, column: "back" })
              }
              className="cursor-text text-sm text-[var(--text-secondary)] truncate block"
            >
              {value}
            </span>
          );
        },
        size: 200,
      }),
      // Deck column
      columnHelper.accessor("deck", {
        header: "Deck",
        cell: ({ getValue }) => (
          <span className="text-xs text-[var(--text-tertiary)] font-mono truncate block">
            {getValue()}
          </span>
        ),
        size: 160,
      }),
      // Due column
      columnHelper.accessor("due", {
        header: "Due",
        cell: ({ getValue }) => {
          const val = getValue();
          return (
            <span
              className={`text-xs font-medium ${
                val === "now" ? "text-primary-500" : "text-[var(--text-tertiary)]"
              }`}
            >
              {val}
            </span>
          );
        },
        size: 70,
      }),
      // Interval column
      columnHelper.accessor("interval", {
        header: "Interval",
        cell: ({ getValue }) => (
          <span className="text-xs text-[var(--text-tertiary)]">
            {getValue()}
          </span>
        ),
        size: 70,
      }),
      // Ease column
      columnHelper.accessor("ease", {
        header: "Ease",
        cell: ({ getValue }) => {
          const ease = getValue();
          const color =
            ease < 2.0
              ? "text-red-500"
              : ease < 2.5
              ? "text-amber-500"
              : "text-green-500";
          return (
            <span className={`text-xs font-mono ${color}`}>
              {ease.toFixed(2)}
            </span>
          );
        },
        size: 60,
      }),
      // Tags column
      columnHelper.accessor("tags", {
        header: "Tags",
        cell: ({ getValue }) => (
          <div className="flex gap-1 overflow-hidden">
            {getValue()
              .slice(0, 2)
              .map((tag) => (
                <span
                  key={tag}
                  className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-2)] text-[var(--text-tertiary)] truncate max-w-[80px]"
                >
                  {tag}
                </span>
              ))}
            {getValue().length > 2 && (
              <span className="text-[10px] text-[var(--text-tertiary)]">
                +{getValue().length - 2}
              </span>
            )}
          </div>
        ),
        size: 180,
      }),
    ],
    [selectedCards, onSelect, editingCell]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse">
        {/* Header */}
        <thead className="sticky top-0 z-10 bg-[var(--surface-1)]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--surface-3)] select-none"
                >
                  {header.isPlaceholder ? null : (
                    <div
                      className={`flex items-center gap-1 ${
                        header.column.getCanSort()
                          ? "cursor-pointer hover:text-[var(--text-secondary)]"
                          : ""
                      }`}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {{
                        asc: <ArrowUp className="w-3 h-3" />,
                        desc: <ArrowDown className="w-3 h-3" />,
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        {/* Body with virtual scrolling simulation */}
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const card = row.original;
            const isSelected = selectedCards.has(card.id);
            const isPaused = card.state === "paused";

            return (
              <tr
                key={row.id}
                onClick={() =>
                  onEdit({
                    id: card.id,
                    front: card.front,
                    back: card.back,
                    deck: card.deck,
                    tags: card.tags,
                  })
                }
                className={`
                  group cursor-pointer border-b border-[var(--surface-3)]/50
                  transition-colors
                  ${isSelected ? "bg-primary-50/50 dark:bg-primary-950/20" : ""}
                  ${isPaused ? "bg-yellow-50/30 dark:bg-yellow-950/10" : ""}
                  hover:bg-[var(--surface-2)]/50
                `}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                    className="px-3 py-2"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Row count footer */}
      <div className="sticky bottom-0 bg-[var(--surface-1)] border-t border-[var(--surface-3)] px-4 py-2 text-xs text-[var(--text-tertiary)]">
        {table.getRowModel().rows.length} cards
      </div>
    </div>
  );
}
