"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Map as MapIcon, Pencil, PenLine, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Field } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Area } from "@/components/ui/display";
import { CardSkeleton } from "@/components/ui/skeleton";
import { ApiErrorBanner } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { FieldFormDialog } from "@/components/features/field-form";

const SVG_W = 400;
const SVG_H = 300;
const SPREAD = 0.005;

type LatLng = number[];

interface Frame {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

function computeFrame(points: LatLng[] | null, anchorLat: number, anchorLng: number): Frame {
  if (!points || points.length === 0) {
    return {
      minLat: anchorLat - SPREAD,
      maxLat: anchorLat + SPREAD,
      minLng: anchorLng - SPREAD,
      maxLng: anchorLng + SPREAD,
    };
  }
  let minLat = points[0][0];
  let maxLat = points[0][0];
  let minLng = points[0][1];
  let maxLng = points[0][1];
  for (const point of points) {
    minLat = Math.min(minLat, point[0]);
    maxLat = Math.max(maxLat, point[0]);
    minLng = Math.min(minLng, point[1]);
    maxLng = Math.max(maxLng, point[1]);
  }
  const spanLat = maxLat - minLat;
  const spanLng = maxLng - minLng;
  const padLat = spanLat > 0 ? spanLat * 0.1 : Math.max(spanLng, SPREAD) * 0.1;
  const padLng = spanLng > 0 ? spanLng * 0.1 : Math.max(spanLat, SPREAD) * 0.1;
  return {
    minLat: minLat - padLat,
    maxLat: maxLat + padLat,
    minLng: minLng - padLng,
    maxLng: maxLng + padLng,
  };
}

function toXY(point: LatLng, frame: Frame): { x: number; y: number } {
  return {
    x: ((point[1] - frame.minLng) / (frame.maxLng - frame.minLng)) * SVG_W,
    y: ((frame.maxLat - point[0]) / (frame.maxLat - frame.minLat)) * SVG_H,
  };
}

function toLatLng(x: number, y: number, frame: Frame): LatLng {
  return [
    frame.maxLat - (y / SVG_H) * (frame.maxLat - frame.minLat),
    frame.minLng + (x / SVG_W) * (frame.maxLng - frame.minLng),
  ];
}

function BoundaryEditor({ field, onSaved }: { field: Field; onSaved: () => void }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const editable = can("field.edit");

  const anchorLat = field.latitude ?? field.farm?.latitude ?? 9.0;
  const anchorLng = field.longitude ?? field.farm?.longitude ?? 38.74;

  const [draft, setDraft] = useState<LatLng[] | null>(null);
  const [closed, setClosed] = useState(false);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const saved = field.boundary ?? [];
  const points = draft ?? saved;
  const activeFrame = frame ?? computeFrame(saved, anchorLat, anchorLng);
  const vertices = points.map((point) => toXY(point, activeFrame));

  const save = useMutation((boundary: LatLng[]) =>
    apiClient.put<{ data: Field }>(`/fields/${field.id}`, {
      farm_id: field.farm_id,
      name: field.name,
      code: field.code ?? null,
      area_hectares: field.area_hectares,
      soil_type: field.soil_type ?? null,
      irrigation_type: field.irrigation_type ?? null,
      topography: field.topography ?? null,
      latitude: field.latitude ?? null,
      longitude: field.longitude ?? null,
      altitude_m: field.altitude_m ?? null,
      status: field.status,
      notes: field.notes ?? null,
      boundary,
    }),
  );

  const startDrawing = () => {
    setError(null);
    setClosed(false);
    setCursor(null);
    setDraft(saved.map((point) => [point[0], point[1]]));
    setFrame(computeFrame(saved, anchorLat, anchorLng));
  };

  const cancel = () => {
    setError(null);
    setClosed(false);
    setCursor(null);
    setDraft(null);
    setFrame(null);
  };

  const clear = () => {
    setClosed(false);
    setCursor(null);
    setDraft([]);
    setFrame(computeFrame(null, anchorLat, anchorLng));
  };

  const localPoint = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * SVG_W,
      y: ((event.clientY - rect.top) / rect.height) * SVG_H,
    };
  };

  const addPoint = (x: number, y: number) => {
    if (draft === null || closed) return;
    setDraft([...draft, toLatLng(x, y, activeFrame)]);
  };

  const finish = (x: number, y: number) => {
    if (draft === null || closed) return;
    const next = [...draft, toLatLng(x, y, activeFrame)];
    while (next.length >= 2) {
      const a = toXY(next[next.length - 1], activeFrame);
      const b = toXY(next[next.length - 2], activeFrame);
      if (Math.hypot(a.x - b.x, a.y - b.y) < 6) next.pop();
      else break;
    }
    setDraft(next);
    if (next.length >= 3) setClosed(true);
  };

  const saveBoundary = async () => {
    if (!draft || draft.length < 3) return;
    setError(null);
    try {
      await save.run(draft);
      toast.success(t("form.saved"));
      cancel();
      onSaved();
    } catch (caught) {
      setError(caught as ApiError);
    }
  };

  const isEmpty = points.length === 0;
  const canClose = (draft?.length ?? 0) >= 3;
  const drawing = draft !== null;

  return (
    <div className="card mt-4">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <MapIcon className="h-4 w-4 text-muted-foreground" /> Boundary
          <span className="text-xs font-normal text-muted-foreground">{points.length} points</span>
        </h2>
        {editable && !drawing && saved.length > 0 && (
          <Button size="sm" variant="secondary" onClick={startDrawing}>
            <PenLine className="h-3.5 w-3.5" /> Edit boundary
          </Button>
        )}
      </div>

      <div className="p-4">
        <ApiErrorBanner error={error} />

        {isEmpty && !drawing ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center">
            <MapIcon className="h-7 w-7 text-muted-foreground" aria-hidden />
            <p className="text-sm font-semibold">No boundary defined</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Outline this field as a polygon to capture its exact shape.
            </p>
            {editable && (
              <Button size="sm" variant="primary" onClick={startDrawing}>
                <PenLine className="h-4 w-4" /> Draw boundary
              </Button>
            )}
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className={cn(
              "aspect-[4/3] w-full rounded-lg border border-border bg-muted/30",
              editable && drawing && !closed && "cursor-crosshair",
            )}
            role="img"
            aria-label="Field boundary"
            onClick={(event) => {
              const { x, y } = localPoint(event);
              addPoint(x, y);
            }}
            onDoubleClick={(event) => {
              const { x, y } = localPoint(event);
              finish(x, y);
            }}
            onMouseMove={(event) => {
              if (!editable || !drawing || closed) return;
              setCursor(localPoint(event));
            }}
            onMouseLeave={() => setCursor(null)}
          >
            {Array.from({ length: 9 }, (_, index) => (
              <line
                key={`v${index}`}
                x1={index * 50}
                y1={0}
                x2={index * 50}
                y2={SVG_H}
                className="stroke-border"
                strokeWidth={1}
              />
            ))}
            {Array.from({ length: 7 }, (_, index) => (
              <line
                key={`h${index}`}
                x1={0}
                y1={index * 50}
                x2={SVG_W}
                y2={index * 50}
                className="stroke-border"
                strokeWidth={1}
              />
            ))}
            {vertices.length >= 3 && (
              <polygon
                points={vertices.map((point) => `${point.x},${point.y}`).join(" ")}
                className={drawing ? "fill-brand-600/20 stroke-brand-600" : "fill-brand-600/15 stroke-brand-600"}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            )}
            {vertices.length === 2 && (
              <polyline
                points={vertices.map((point) => `${point.x},${point.y}`).join(" ")}
                className="stroke-brand-600"
                fill="none"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            )}
            {drawing && !closed && cursor && vertices.length > 0 && (
              <line
                x1={vertices[vertices.length - 1].x}
                y1={vertices[vertices.length - 1].y}
                x2={cursor.x}
                y2={cursor.y}
                className="stroke-brand-600/70"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
            )}
            {vertices.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={4}
                strokeWidth={2}
                className={drawing ? "fill-brand-500 stroke-surface" : "fill-surface stroke-brand-600"}
              />
            ))}
          </svg>
        )}

        {drawing && (
          <>
            <p className="mt-2 text-xs text-muted-foreground">
              {closed
                ? `${points.length} points · save to apply the new boundary`
                : "Click the canvas to add points · double-click or press Close to finish"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="ghost" onClick={clear}>
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </Button>
              {closed ? (
                <Button size="sm" variant="secondary" onClick={() => setClosed(false)} disabled={!canClose}>
                  Continue drawing
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setClosed(true)} disabled={!canClose}>
                  Close
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="secondary" onClick={cancel} type="button">
                  {t("action.cancel")}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={saveBoundary}
                  disabled={!canClose}
                  loading={save.pending}
                >
                  Save boundary
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FieldDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);

  const { data: payload, loading, refetch } = useResource<{ data: Field }>(`/fields/${params.id}`);
  const field = payload?.data;

  if (loading && !field) {
    return (
      <div className="grid gap-4">
        <CardSkeleton rows={5} />
        <CardSkeleton rows={4} />
      </div>
    );
  }

  if (!field) {
    return <div className="card p-8 text-center text-sm text-muted-foreground">{t("common.notFound")}</div>;
  }

  const stats: Array<{ label: string; value: React.ReactNode }> = [
    { label: t("common.area"), value: <Area value={field.area_hectares} /> },
    { label: "Soil type", value: field.soil_type ?? "—" },
    { label: "Irrigation", value: field.irrigation_type ?? "—" },
    { label: "Altitude", value: field.altitude_m != null ? `${field.altitude_m} m` : "—" },
  ];

  const info: Array<{ label: string; value: React.ReactNode; wide?: boolean }> = [
    {
      label: "Farm",
      value: (
        <Link href={`/app/farms/${field.farm_id}`} className="font-medium text-brand-700 hover:underline">
          {field.farm?.name ?? `Farm #${field.farm_id}`}
        </Link>
      ),
    },
    { label: "Topography", value: field.topography ?? "—" },
    {
      label: "Coordinates",
      value:
        field.latitude != null && field.longitude != null ? (
          <span className="tabular-nums">
            {field.latitude}, {field.longitude}
          </span>
        ) : (
          "—"
        ),
    },
    { label: t("common.notes"), value: field.notes ?? "—", wide: true },
    {
      label: t("action.qrCode"),
      value: <span className="font-mono text-xs">{field.qr_code ?? "—"}</span>,
      wide: true,
    },
  ];

  return (
    <div>
      <button
        onClick={() => router.push("/app/fields")}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("nav.fields")}
      </button>

      <PageHeader
        title={field.name}
        subtitle={[field.code, field.farm?.name].filter(Boolean).join(" · ")}
        actions={
          <>
            <StatusBadge status={field.status} />
            {can("field.edit") && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> {t("action.edit")}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
            <p className="mt-1.5 text-lg font-bold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="card mt-4 p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("common.details")}</h2>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {info.map((item) => (
            <div key={item.label} className={item.wide ? "sm:col-span-2" : undefined}>
              <dt className="label">{item.label}</dt>
              <dd className="text-sm text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <BoundaryEditor field={field} onSaved={() => void refetch()} />

      {editing && (
        <FieldFormDialog
          key={field.id}
          field={field}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            toast.success(t("form.saved"));
            void refetch();
          }}
        />
      )}
    </div>
  );
}

export default function FieldDetailPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <FieldDetailContent />
    </Suspense>
  );
}
