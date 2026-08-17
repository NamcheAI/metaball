# Metaball turntable rig — run via Blender MCP execute_blender_code.
# Replace OBJECT_NAME, WORKDIR, and optional overrides before executing.
#
# Blender 4.x / 5.1 notes:
# - Prefer LINEAR keyframes on the orbit empty
# - Blender 5.1 layered actions: action.layers[0].strips[0].channelbags → fcurves
# - Render PNG sequence; encode with encode_turntable.sh (no FFMPEG file format)

import bpy
import math
import os
from mathutils import Vector

OBJECT_NAME = "OBJECT_NAME"
WORKDIR = os.path.expanduser("./blender-handoff/beauty_cam")
DURATION = 5
FPS = 24
CAMERA_LENS = 50.0
TRANSPARENT_BG = True
SAMPLES = 64
# None → auto from bbox
CAMERA_DISTANCE = None
CAMERA_HEIGHT = None
# radians offset so frame 1 faces "front" (−Y default)
FRONT_YAW = 0.0

obj = bpy.data.objects[OBJECT_NAME]
bbox = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
center = sum(bbox, Vector()) / 8.0
dims = Vector(
    (
        max(v.x for v in bbox) - min(v.x for v in bbox),
        max(v.y for v in bbox) - min(v.y for v in bbox),
        max(v.z for v in bbox) - min(v.z for v in bbox),
    )
)
bbox_radius = max((corner - center).length for corner in bbox)

scene = bpy.context.scene
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100

# Clean prior turntable helpers
for name in ("TurntableTarget", "TurntableCamera"):
    old = bpy.data.objects.get(name)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)

bpy.ops.object.empty_add(type="PLAIN_AXES", location=center)
target = bpy.context.active_object
target.name = "TurntableTarget"

bpy.ops.object.camera_add(location=center)
cam = bpy.context.active_object
cam.name = "TurntableCamera"
cam.data.lens = CAMERA_LENS

# `view_frame` includes lens, sensor fit, and output aspect ratio. Fit the
# bounding sphere derived from all transformed bbox corners to the limiting
# horizontal/vertical FOV; the sphere remains valid throughout the orbit.
frame = cam.data.view_frame(scene=scene)
tan_half_x = min(abs(corner.x / corner.z) for corner in frame)
tan_half_y = min(abs(corner.y / corner.z) for corner in frame)
half_fov = math.atan(min(tan_half_x, tan_half_y))
fit_margin = 1.12
required_range = fit_margin * bbox_radius / max(math.sin(half_fov), 1e-6)

if CAMERA_DISTANCE is None:
    if CAMERA_HEIGHT is None:
        height_ratio = 0.35
        distance = required_range / math.sqrt(1.0 + height_ratio * height_ratio)
        height = height_ratio * distance
    else:
        height = CAMERA_HEIGHT
        distance = math.sqrt(max(required_range * required_range - height * height, 0.0))
        distance = max(distance, bbox_radius * 0.1)
else:
    distance = CAMERA_DISTANCE
    height = CAMERA_HEIGHT if CAMERA_HEIGHT is not None else 0.35 * distance

# Front = −Y from center, plus FRONT_YAW.
x = center.x + distance * math.sin(FRONT_YAW)
y = center.y - distance * math.cos(FRONT_YAW)
z = center.z + height
cam.location = (x, y, z)
camera_range = math.hypot(distance, height)
cam.data.clip_start = max(0.001, camera_range - bbox_radius * 1.5)
cam.data.clip_end = max(1000.0, camera_range + bbox_radius * 3.0)

track = cam.constraints.new(type="TRACK_TO")
track.target = target
track.track_axis = "TRACK_NEGATIVE_Z"
track.up_axis = "UP_Y"

bpy.ops.object.select_all(action="DESELECT")
cam.select_set(True)
target.select_set(True)
bpy.context.view_layer.objects.active = target
bpy.ops.object.parent_set(type="OBJECT", keep_transform=True)

scene.camera = cam
total = DURATION * FPS
scene.frame_start = 1
scene.frame_end = total
scene.render.fps = FPS

target.rotation_euler = (0.0, 0.0, 0.0)
target.keyframe_insert(data_path="rotation_euler", frame=1)
target.rotation_euler = (0.0, 0.0, math.radians(360.0))
target.keyframe_insert(data_path="rotation_euler", frame=total + 1)

action = target.animation_data.action
try:
    # Blender 5.1 layered actions
    strip = action.layers[0].strips[0]
    fcurves = []
    for cb in strip.channelbags:
        fcurves.extend(cb.fcurves)
except Exception:
    fcurves = action.fcurves
for fc in fcurves:
    for kp in fc.keyframe_points:
        kp.interpolation = "LINEAR"

scene.render.engine = "CYCLES"
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
try:
    scene.cycles.device = "GPU"
except Exception:
    pass
scene.render.film_transparent = TRANSPARENT_BG
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"

frames_dir = os.path.join(WORKDIR, "turntable_frames")
os.makedirs(frames_dir, exist_ok=True)
# Trailing separator → frame sequence
scene.render.filepath = os.path.join(frames_dir, "")

print(
    f"Turntable ready: center={tuple(center)} radius={bbox_radius:.4f} "
    f"distance={distance:.4f} height={height:.4f} "
    f"frames={total} → {frames_dir}"
)
# Caller should: bpy.ops.render.render(animation=True)
# then encode_turntable.sh
