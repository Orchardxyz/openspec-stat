import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpinnerManager } from '../../ui/spinner';

const spinnerInstance = vi.hoisted(() => ({
  start: vi.fn(() => spinnerInstance),
  succeed: vi.fn(),
  fail: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  stop: vi.fn(),
  text: '',
}));

const oraMock = vi.hoisted(() => vi.fn(() => spinnerInstance));

vi.mock('ora', () => ({
  __esModule: true,
  default: oraMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  spinnerInstance.text = '';
});

describe('SpinnerManager', () => {
  it('starts and updates spinner when not quiet', () => {
    const manager = new SpinnerManager(false);

    manager.start('start');
    manager.update('progress');
    manager.succeed('done');
    manager.fail('fail');
    manager.warn('warn');
    manager.info('info');
    manager.stop();

    expect(oraMock).toHaveBeenCalledWith('start');
    expect(spinnerInstance.start).toHaveBeenCalled();
    expect(spinnerInstance.text).toBe('progress');
    expect(spinnerInstance.succeed).toHaveBeenCalledWith('done');
    expect(spinnerInstance.fail).toHaveBeenCalledWith('fail');
    expect(spinnerInstance.warn).toHaveBeenCalledWith('warn');
    expect(spinnerInstance.info).toHaveBeenCalledWith('info');
    expect(spinnerInstance.stop).toHaveBeenCalled();
  });

  it('does nothing when quiet', () => {
    const manager = new SpinnerManager(true);

    manager.start('start');
    manager.update('progress');
    manager.succeed('done');
    manager.fail('fail');
    manager.warn('warn');
    manager.info('info');
    manager.stop();

    expect(oraMock).not.toHaveBeenCalled();
    expect(spinnerInstance.start).not.toHaveBeenCalled();
    expect(spinnerInstance.succeed).not.toHaveBeenCalled();
    expect(spinnerInstance.fail).not.toHaveBeenCalled();
    expect(spinnerInstance.warn).not.toHaveBeenCalled();
    expect(spinnerInstance.info).not.toHaveBeenCalled();
    expect(spinnerInstance.stop).not.toHaveBeenCalled();
    expect(spinnerInstance.text).toBe('');
  });
});
