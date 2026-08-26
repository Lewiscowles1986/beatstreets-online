/**
 * Minimal scene / state machine — a TypeScript port of `arcade_core/scene.py`.
 * Drives the menu / play / game-over / cheat / pause flow as discrete scenes.
 */

export abstract class Scene {
  abstract update(dt?: number): void;
  abstract draw(): void;
}

export class SceneManager {
  private scenes = new Map<string, Scene>();
  current: string | null = null;

  add(name: string, scene: Scene): void {
    this.scenes.set(name, scene);
  }

  switch(name: string): void {
    if (!this.scenes.has(name)) {
      throw new Error(`unknown scene: ${name} (have ${[...this.scenes.keys()].sort()})`);
    }
    this.current = name;
  }

  update(dt = 0): void {
    if (this.current === null) return;
    this.scenes.get(this.current)!.update(dt);
  }

  draw(): void {
    if (this.current === null) return;
    this.scenes.get(this.current)!.draw();
  }

  names(): string[] {
    return [...this.scenes.keys()];
  }
}
