import React, { useEffect, useRef } from 'react';

export default function BgShader() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrameId;
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false });

    if (!gl) return;

    const vertexShaderSource = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_position * 0.5 + 0.5;
      }
    `;

    const fragmentShaderSource = `
      precision highp float;
      varying vec2 v_texCoord;
      uniform float u_time;
      uniform vec2 u_resolution;

      void main() {
        vec2 uv = v_texCoord;
        
        // Subtle clinical ambient glow drifting slowly
        vec2 center1 = vec2(0.5 + 0.2 * cos(u_time * 0.4), 0.5 + 0.2 * sin(u_time * 0.3));
        vec2 center2 = vec2(0.5 + 0.3 * sin(u_time * 0.2), 0.5 + 0.1 * cos(u_time * 0.5));
        
        float glow1 = 0.015 / length(uv - center1);
        float glow2 = 0.01 / length(uv - center2);
        
        // Base surface color (light Clinical Precision #f8f9ff)
        vec3 color = vec3(0.97, 0.98, 1.0); 
        
        // Add a hint of brand emerald (#10b981)
        vec3 brandColor = vec3(0.06, 0.72, 0.51);
        color = mix(color, brandColor, (glow1 + glow2) * 0.035);
        
        // Subtle grid pattern
        vec2 gridUv = uv * 40.0;
        float grid = 1.0 - (smoothstep(0.0, 0.01, abs(fract(gridUv.x - 0.5) - 0.5)) * 
                            smoothstep(0.0, 0.01, abs(fract(gridUv.y - 0.5) - 0.5)));
        
        color = mix(color, vec3(1.0), grid * 0.008);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    function createShader(glContext, type, source) {
      const shader = glContext.createShader(type);
      glContext.shaderSource(shader, source);
      glContext.compileShader(shader);
      if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
        glContext.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([
      -1.0, -1.0, 1.0, -1.0, -1.0, 1.0,
      1.0, -1.0, 1.0, 1.0, -1.0, 1.0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const render = (time) => {
      const elapsed = time * 0.001;
      gl.useProgram(program);
      gl.uniform1f(timeLocation, elapsed);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none opacity-80"
    />
  );
}
