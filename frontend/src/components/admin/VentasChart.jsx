// ============================================================
//  El Fogón Criollo — VentasChart.jsx
//  Gráfico de área con Recharts para ventas diarias
// ============================================================

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import styles from './Charts.module.css';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className={styles.tooltipRow}>
          <span className={styles.tooltipDot} style={{ background: p.color }} />
          <span className={styles.tooltipName}>{p.name}:</span>
          <span className={styles.tooltipVal}>
            {p.dataKey === 'total_ingresos'
              ? `S/ ${Number(p.value).toFixed(2)}`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function VentasChart({ data = [] }) {
  const chartData = data.map(d => ({
    ...d,
    fecha: String(d.fecha ?? '').slice(5), // MM-DD
    total_ingresos: Number(d.total_ingresos),
    total_pedidos:  Number(d.total_pedidos),
  }));

  return (
    <div>
      <h3 className={styles.chartTitle}>Ventas diarias</h3>
      {data.length === 0 ? (
        <p className={styles.empty}>Sin datos en este rango</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#C85A1A" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#C85A1A" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradPedidos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#42A5F5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#42A5F5" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="fecha"
              tick={{ fill: '#9B8B7A', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="ingresos"
              orientation="left"
              tick={{ fill: '#9B8B7A', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `S/${v}`}
              width={52}
            />
            <YAxis
              yAxisId="pedidos"
              orientation="right"
              tick={{ fill: '#9B8B7A', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', color: '#9B8B7A', paddingTop: '8px' }}
            />
            <Area
              yAxisId="ingresos"
              type="monotone"
              dataKey="total_ingresos"
              name="Ingresos"
              stroke="#C85A1A"
              strokeWidth={2}
              fill="url(#gradIngresos)"
              dot={false}
              activeDot={{ r: 5, fill: '#F2A74B', strokeWidth: 0 }}
            />
            <Area
              yAxisId="pedidos"
              type="monotone"
              dataKey="total_pedidos"
              name="Pedidos"
              stroke="#42A5F5"
              strokeWidth={1.5}
              fill="url(#gradPedidos)"
              dot={false}
              activeDot={{ r: 4, fill: '#42A5F5', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── HorasChart - barras por hora ─────────────────────────
import {
  BarChart, Bar, Cell,
} from 'recharts';

export function HorasChart({ data = [] }) {
  // Rellenar horas sin datos con 0
  const full = Array.from({ length: 24 }, (_, h) => {
    const found = data.find(d => Number(d.hora) === h);
    return { hora: `${String(h).padStart(2, '0')}h`, ingresos: Number(found?.ingresos ?? 0) };
  });
  const maxVal = Math.max(...full.map(d => d.ingresos), 1);

  return (
    <div>
      <h3 className={styles.chartTitle}>Ventas por hora — hoy</h3>
      {data.length === 0 ? (
        <p className={styles.empty}>Sin ventas hoy todavía</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={full} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="hora"
              tick={{ fill: '#9B8B7A', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval={2}
            />
            <YAxis
              tick={{ fill: '#9B8B7A', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `S/${v}`}
              width={44}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="ingresos" name="Ingresos" radius={[3, 3, 0, 0]} maxBarSize={18}>
              {full.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.ingresos === maxVal ? '#F2A74B' : 'rgba(200,90,26,0.55)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
