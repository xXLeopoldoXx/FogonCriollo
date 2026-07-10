// tests/unit/pedidoStateMachine.test.js
// ============================================================
//  Tests: Máquina de estados de pedido
//  Criterios de aceptación:
//   1. Solo avanza por transiciones válidas
//   2. Rechaza transiciones ilegales (regresión / salto / desde ENTREGADO)
//   3. Acepta cualquier estado inicial válido
//   4. Nunca muta el objeto original (inmutabilidad)
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  ESTADOS,
  TRANSICIONES,
  puedeTransicionar,
  aplicarTransicion,
  esEstadoValido,
} from '../../../frontend/src/models/pedidoStateMachine.js';

// ── 1. Constantes del dominio ─────────────────────────────
describe('ESTADOS', () => {
  it('define los cuatro estados del dominio', () => {
    expect(ESTADOS.PENDIENTE).toBe('PENDIENTE');
    expect(ESTADOS.EN_PROCESO).toBe('EN_PROCESO');
    expect(ESTADOS.LISTO).toBe('LISTO');
    expect(ESTADOS.ENTREGADO).toBe('ENTREGADO');
  });
});

// ── 2. esEstadoValido ─────────────────────────────────────
describe('esEstadoValido', () => {
  it('acepta los cuatro estados válidos', () => {
    Object.values(ESTADOS).forEach(e => expect(esEstadoValido(e)).toBe(true));
  });

  it('rechaza strings arbitrarios', () => {
    expect(esEstadoValido('CANCELADO')).toBe(false);
    expect(esEstadoValido('')).toBe(false);
    expect(esEstadoValido(null)).toBe(false);
    expect(esEstadoValido(undefined)).toBe(false);
  });
});

// ── 3. puedeTransicionar ──────────────────────────────────
describe('puedeTransicionar', () => {
  it.each([
    ['PENDIENTE',  'EN_PROCESO'],
    ['EN_PROCESO', 'LISTO'],
    ['LISTO',      'ENTREGADO'],
  ])('permite %s → %s', (desde, hasta) => {
    expect(puedeTransicionar(desde, hasta)).toBe(true);
  });

  it.each([
    // Regresiones
    ['EN_PROCESO', 'PENDIENTE',  'regresión'],
    ['LISTO',      'EN_PROCESO', 'regresión'],
    ['ENTREGADO',  'LISTO',      'regresión'],
    // Saltos
    ['PENDIENTE',  'LISTO',      'salto'],
    ['PENDIENTE',  'ENTREGADO',  'salto'],
    ['EN_PROCESO', 'ENTREGADO',  'salto'],
    // Desde estado final
    ['ENTREGADO',  'ENTREGADO',  'mismo estado final'],
    // Estados inválidos
    ['PENDIENTE',  'INVALIDO',   'estado destino inválido'],
    ['INVALIDO',   'PENDIENTE',  'estado origen inválido'],
  ])('rechaza %s → %s (%s)', (desde, hasta) => {
    expect(puedeTransicionar(desde, hasta)).toBe(false);
  });
});

// ── 4. aplicarTransicion ──────────────────────────────────
describe('aplicarTransicion', () => {
  it('retorna nuevo pedido con estado actualizado', () => {
    const pedido   = { id_pedido: 1, estado: 'PENDIENTE', numero_mesa: 3 };
    const resultado = aplicarTransicion(pedido, 'EN_PROCESO');

    expect(resultado.estado).toBe('EN_PROCESO');
    expect(resultado.id_pedido).toBe(1);     // mantiene datos
    expect(resultado.numero_mesa).toBe(3);   // mantiene datos
  });

  it('NO muta el pedido original (inmutabilidad)', () => {
    const original = Object.freeze({ id_pedido: 2, estado: 'PENDIENTE' });
    const resultado = aplicarTransicion(original, 'EN_PROCESO');

    expect(original.estado).toBe('PENDIENTE'); // sin mutación
    expect(resultado).not.toBe(original);       // objeto diferente
  });

  it('lanza error en transición ilegal', () => {
    const pedido = { id_pedido: 3, estado: 'LISTO' };
    expect(() => aplicarTransicion(pedido, 'PENDIENTE'))
      .toThrow(/transición.*inválida/i);
  });

  it('lanza error si el pedido está ENTREGADO', () => {
    const pedido = { id_pedido: 4, estado: 'ENTREGADO' };
    expect(() => aplicarTransicion(pedido, 'ENTREGADO'))
      .toThrow(/transición.*inválida/i);
  });

  it('incluye timestamp de actualización', () => {
    const pedido   = { id_pedido: 5, estado: 'EN_PROCESO' };
    const antes     = Date.now();
    const resultado = aplicarTransicion(pedido, 'LISTO');
    const despues   = Date.now();

    expect(resultado.updatedAt).toBeGreaterThanOrEqual(antes);
    expect(resultado.updatedAt).toBeLessThanOrEqual(despues);
  });
});
