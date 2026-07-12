/**
 * Circuit Breaker Pattern (R5)
 * 
 * Prevents cascading failures when external APIs (Unipile, Nvidia) are down.
 * 
 * States:
 *   CLOSED   → Normal operation, calls go through
 *   OPEN     → API is down, calls are immediately rejected (cooldown period)
 *   HALF_OPEN → After cooldown, allow 1 test call to check recovery
 * 
 * Usage:
 *   const breaker = new CircuitBreaker('unipile', { failureThreshold: 5, cooldownMs: 15 * 60 * 1000 });
 *   const result = await breaker.call(() => unipile.sendConnectionRequest(...));
 */
const { createLogger } = require('./logger');
const log = createLogger('CircuitBreaker');

const STATE = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

class CircuitBreaker {
  /**
   * @param {string} name - Identifier for this breaker (e.g., 'unipile', 'nvidia')
   * @param {Object} options
   * @param {number} options.failureThreshold - Consecutive failures before opening (default: 5)
   * @param {number} options.cooldownMs - Time to wait before half-open test (default: 15 min)
   * @param {number} options.successThreshold - Successes in half-open to close (default: 1)
   */
  constructor(name, options = {}) {
    this.name = name;
    this.state = STATE.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.failureThreshold = options.failureThreshold || 5;
    this.cooldownMs = options.cooldownMs || 15 * 60 * 1000; // 15 minutes
    this.successThreshold = options.successThreshold || 1;
  }

  /**
   * Execute a function through the circuit breaker
   * @param {Function} fn - Async function to execute
   * @returns {Promise<*>} - Result of the function
   * @throws {Error} - If circuit is open
   */
  async call(fn) {
    // Check if we should transition from OPEN to HALF_OPEN
    if (this.state === STATE.OPEN) {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.cooldownMs) {
        log.info({ breaker: this.name, cooldownMs: this.cooldownMs }, 'Cooldown elapsed, transitioning to HALF_OPEN');
        this.state = STATE.HALF_OPEN;
        this.successCount = 0;
      } else {
        const remainingSec = Math.ceil((this.cooldownMs - elapsed) / 1000);
        const err = new Error(`Circuit breaker [${this.name}] is OPEN. Retry in ${remainingSec}s`);
        err.circuitOpen = true;
        err.retryAfterMs = this.cooldownMs - elapsed;
        throw err;
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure(err);
      throw err;
    }
  }

  _onSuccess() {
    if (this.state === STATE.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        log.info({ breaker: this.name }, 'Test call succeeded, circuit CLOSED');
        this.state = STATE.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else {
      // Reset failure count on any success in CLOSED state
      this.failureCount = 0;
    }
  }

  _onFailure(err) {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === STATE.HALF_OPEN) {
      log.warn({ breaker: this.name, err: err.message }, 'Half-open test call failed, re-opening circuit');
      this.state = STATE.OPEN;
      return;
    }

    if (this.failureCount >= this.failureThreshold) {
      log.error(
        { breaker: this.name, failures: this.failureCount, cooldownMs: this.cooldownMs },
        'Failure threshold reached — circuit OPENED'
      );
      this.state = STATE.OPEN;
    } else {
      log.warn(
        { breaker: this.name, failures: this.failureCount, threshold: this.failureThreshold },
        'Failure recorded'
      );
    }
  }

  /** Get current state for health check / diagnostics */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
    };
  }

  /** Manually reset the circuit (e.g., from admin panel) */
  reset() {
    log.info({ breaker: this.name }, 'Circuit manually reset to CLOSED');
    this.state = STATE.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }
}

// Singleton breakers for external services
const unipileBreaker = new CircuitBreaker('unipile', {
  failureThreshold: 5,
  cooldownMs: 15 * 60 * 1000, // 15 minutes
});

const nvidiaBreaker = new CircuitBreaker('nvidia', {
  failureThreshold: 5,
  cooldownMs: 10 * 60 * 1000, // 10 minutes
});

module.exports = { CircuitBreaker, unipileBreaker, nvidiaBreaker };
