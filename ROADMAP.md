# Aether Engine: The Master Plan

This document outlines the strategic roadmap for the Aether synthesis engine. It details the major phases of development required to realize the full vision laid out in our core design document, **[docs/AETHER_PARADIGMS.md](docs/AETHER_PARADIGMS.md)**.

The journey is divided into three distinct, sequential phases. Each phase represents a significant leap in the engine's expressive power, moving incrementally from our current state towards the ultimate goal of simulating entire sonic universes.

---

## Phase 1: The `Physis` Paradigm (The Next Revolution)

This is the next major feature and the highest-impact step. It introduces the ability to model discrete, physical objects, moving beyond algorithmic simulation to a more intuitive, physics-based approach.

### Goals:
1.  **Create a `physis(id, factory)` Registration Function:** This will be the new entry point for defining physical objects. The factory will not return an `update` function, but a `derivatives` function that describes the forces acting on the object.
2.  **Implement a Numerical Integrator in the Engine Core:** The main engine loop (`updateAll`) will be modified to recognize `Physis` objects.
3.  **Integrate a Simple Physics Solver (Euler Method):** For each `Physis` object on each sample, the engine will:
    a.  Call the user-provided `derivatives(state)` function to get the current rates of change (e.g., acceleration).
    b.  Use a fixed, internal `dt` to calculate the next state (`velocity += acceleration * dt`, `position += velocity * dt`).
    c.  Update the state in the main memory buffer.

### Success Criteria:
-   A user can define a "mass-on-a-spring" or "pendulum" object using the `Physis` paradigm.
-   The object oscillates and produces sound according to its physical parameters (`tension`, `friction`, `mass`).
-   The live coding experience feels like manipulating a physical object, not an algorithm.

### Estimated Difficulty: **Medium**

This is the next logical feature, not a full rewrite. It builds directly on the concepts proven in the `Atomos` paradigm.

---

## Phase 2: The Composition Layer (The Unified System)

This phase transforms the engine from a collection of independent sound sources into a truly interconnected, compositional system. It allows the paradigms to interact, unlocking emergent behavior.

### Goals:
1.  **Implement a Dependency Graph:** The engine must be able to understand when one signal is used as an input to another.
2.  **Introduce a Topological Sort:** The `updateAll` loop will be re-architected to process signals in the correct order based on the dependency graph. A signal that acts as a "driver" must be calculated before the object it is driving.
3.  **Create a Data Flow Mechanism:** The engine needs a formal way to route the output of one signal into the `derivatives` function of a `Physis` object (or the `update` function of other types).
4.  **Expose a User-Facing API (`drive`, `inputs`):** Create an intuitive way for users to define these cross-paradigm connections.

### Success Criteria:
-   A `Flux` oscillator can be used to continuously `drive` a `Physis` object.
-   The user can create physically modeled resonators, where the interaction between the driver and the object produces the final sound.
-   The system remains performant and stable under these new, more complex data flow requirements.

### Estimated Difficulty: **Medium-High**

This is a major refactor of the engine's core logic, moving from a simple loop to a graph-based processing model.

---

## Phase 3: The `Field` Paradigm (The Grand Project)

This is the ultimate goal of the Aether vision. It moves beyond modeling discrete objects to simulating entire, continuous sonic mediums.

### Goals:
1.  **Implement a `field(id, factory)` Registration Function:** The new API for defining resonant mediums.
2.  **Architect Spatial State Management:** The engine will need to allocate and manage large, contiguous blocks of memory for fields (e.g., 1D strings, 2D membranes).
3.  **Create a Spatial Update Loop:** The engine's core will need a new type of loop that iterates through points in space, providing each point with access to its **neighbors**.
4.  **Implement Boundary Conditions:** The spatial loop must correctly handle the physics at the edges of the medium (e.g., wave reflection or absorption).
5.  **Integrate PDE Solvers:** The engine will need to solve Partial Differential Equations (like the wave equation) for each point in the field.
6.  **Connect to the Composition Layer:** The `inputs` defined in a `Field` object must be correctly driven by other signals via the dependency graph from Phase 2.

### Success Criteria:
-   A user can define a 1D "vibrating string" `Field`.
-   The user can excite the `Field` with an `initial_state` ("pluck") or a continuous `input` ("bow") and hear physically accurate wave propagation, reflection, and resonance.
-   The system is the foundation for modeling physical acoustics, waveguides, and resonant bodies.

### Estimated Difficulty: **High**

This is a massive architectural undertaking and represents a significant research and development project in its own right. The successful completion of Phases 1 and 2 is a critical prerequisite.

