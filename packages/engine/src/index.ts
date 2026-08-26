/**
 * @beatstreets/engine — pure Beat Streets game logic.
 * Framework-agnostic: no React, no DOM, no Vite. Imported by the app and tests.
 */

// DSL — typed, validated game data.
export * from './dsl/primitives';
export * from './dsl/config';
export * from './dsl/characters';
export * from './dsl/attacks';
export * from './dsl/stages';
export * from './dsl/story';
export * from './dsl/game-spec';

// Core primitives.
export * from './core/math';
export * from './core/input';
export * from './core/scene';
export * from './core/controller';
export * from './core/controller-gamepad';
export * from './core/controller-websocket';
export * from './core/konami';

// Engine.
export * from './engine/attack';
export * from './engine/fighter';
export * from './engine/player';
export * from './engine/enemy';
export * from './engine/enemies';
export * from './engine/game';
