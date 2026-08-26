import { AttackSpec } from '../dsl/attacks';

/**
 * A fighter's action (attack / throw / grab) built from the DSL attack spec.
 * Pure data + the timing helpers the Fighter uses.
 */
export class Attack {
  name: string;
  sprite?: string;
  strength: number;
  animTime: number;
  frameTime: number;
  frames: number;
  hitFrames: number[];
  recoveryTime: number;
  reach: number;
  throw: boolean;
  grab: boolean;
  comboNext: Record<number, string>;
  flyingKick: boolean;
  staminaCost: number;
  rearAttack: boolean;
  staminaDamageMultiplier: number;
  stunTimeMultiplier: number;
  initialSound?: [string, number];
  hitSound?: [string, number];

  constructor(spec: AttackSpec) {
    this.name = spec.name;
    this.sprite = spec.sprite;
    this.strength = spec.strength;
    this.animTime = spec.anim_time ?? 18;
    this.frameTime = spec.frame_time;
    this.frames = spec.frames;
    this.hitFrames = spec.hit_frames;
    this.recoveryTime = spec.recovery_time;
    this.reach = spec.reach;
    this.throw = spec.throw;
    this.grab = spec.grab;
    this.comboNext = spec.combo_next;
    this.flyingKick = spec.flying_kick;
    this.staminaCost = spec.stamina_cost;
    this.rearAttack = spec.rear_attack;
    this.staminaDamageMultiplier = spec.stamina_damage_multiplier;
    this.stunTimeMultiplier = spec.stun_time_multiplier;
    this.initialSound = spec.initial_sound;
    this.hitSound = spec.hit_sound;
  }

  /** Animation frame index for a given game-frame counter. */
  frameAt(counter: number): number {
    return Math.min(Math.floor(counter / this.frameTime), this.frames - 1);
  }
}
