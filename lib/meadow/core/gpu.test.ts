import { describe, expect, it } from "vitest";
import { desktopTier, isSoftwareRenderer } from "./gpu.js";

describe("isSoftwareRenderer", () => {
  it.each([
    "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)",
    "ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "llvmpipe (LLVM 15.0.7, 256 bits)",
    "Mesa softpipe",
  ])("flags %s", (name) => expect(isSoftwareRenderer(name)).toBe(true));

  it.each([
    "ANGLE (NVIDIA, NVIDIA GeForce RTX 4050 Laptop GPU (0x000028E1) Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "Apple GPU",
    "Adreno (TM) 650",
    "",
  ])("lets %s through", (name) => expect(isSoftwareRenderer(name)).toBe(false));

  it("treats a missing name as hardware", () => expect(isSoftwareRenderer(undefined)).toBe(false));
});

describe("desktopTier", () => {
  const intelUhd = "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)";
  const irisXe = "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)";
  const rtx = "ANGLE (NVIDIA, NVIDIA GeForce RTX 4050 Laptop GPU (0x000028E1) Direct3D11 vs_5_0 ps_5_0, D3D11)";
  const radeonApu = "ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)";

  it("puts Intel UHD office laptops on low", () => expect(desktopTier(intelUhd)).toBe("low"));
  it("puts Iris Xe and Radeon APUs on medium", () => {
    expect(desktopTier(irisXe)).toBe("medium");
    expect(desktopTier(radeonApu)).toBe("medium");
  });
  it("drops integrated graphics to low on a small machine", () => expect(desktopTier(irisXe, 4, 8)).toBe("low"));
  it("keeps discrete GPUs and Apple on high", () => {
    expect(desktopTier(rtx)).toBe("high");
    expect(desktopTier("Apple M2")).toBe("high");
  });
  it("caps an unknown GPU on a weak machine at medium", () => expect(desktopTier("", 2, 4)).toBe("medium"));
});
