import bpy
import json
import math
import sys
from pathlib import Path
from mathutils import Matrix, Vector

source, output, *filter_names = sys.argv[sys.argv.index("--") + 1:]
data = json.loads(Path(source).read_text())
output = Path(output)
output.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 22
scene.cycles.use_denoising = False
scene.render.resolution_x, scene.render.resolution_y = 1000, 784
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = True
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.view_settings.exposure = .2
scene.world.color = (.28, .34, .45)

def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()

def panel(name, position, size, energy, color):
    light = bpy.data.lights.new(name, "AREA")
    light.shape = "RECTANGLE"
    light.energy = energy
    light.size, light.size_y = size
    light.color = color
    obj = bpy.data.objects.new(name, light)
    scene.collection.objects.link(obj)
    obj.location = position
    aim(obj, (0, 0, 0))
    return obj

key = panel("Key", (-3, 3, 4), (5, 3), 620, (1, .94, .87))
panel("Right strip", (4, 1, 3), (1.4, 5), 740, (.76, .88, 1))
panel("Rim", (2, 2, -4), (4, 3), 810, (.82, .92, 1))
panel("Ceiling", (0, 5, 0), (4, 4), 780, (1, 1, 1))
panel("Front fill", (-.5, 0, 5), (4, 4), 150, (.83, .92, 1))
cam = bpy.data.objects.new("Camera", bpy.data.cameras.new("Camera"))
scene.collection.objects.link(cam)
scene.camera = cam
cam.data.lens = 48
cam.data.sensor_fit = "VERTICAL"
cam.data.sensor_height = 27.6

def triples(items):
    return list(zip(items[::3], items[1::3], items[2::3]))

geometries = {}
materials = {}
def geometry(identifier):
    if identifier not in geometries:
        desc = data["geometry"][identifier]
        verts = triples(desc["verts"])
        faces = triples(desc["indices"] if desc["indices"] is not None else range(len(verts)))
        geo = bpy.data.meshes.new(identifier)
        geo.from_pydata(verts, [], faces)
        geo.update()
        for poly in geo.polygons:
            poly.use_smooth = True
        if desc["uv"]:
            uv = geo.uv_layers.new()
            for loop in geo.loops:
                i = loop.vertex_index * 2
                uv.data[loop.index].uv = desc["uv"][i:i+2]
        geometries[identifier] = geo
    return geometries[identifier]

def material(properties):
    name = str(properties)
    if name in materials:
        return materials[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    tree = m.node_tree
    bsdf = tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*properties["color"], 1)
    bsdf.inputs["Roughness"].default_value = properties["roughness"]
    bsdf.inputs["Metallic"].default_value = properties["metalness"]
    if properties["fabric"]:
        tex = tree.nodes.new("ShaderNodeTexVoronoi")
        tex.inputs["Scale"].default_value = 215 if properties["fabric"] == "open" else 175
        tex.inputs["Randomness"].default_value = .20
        bump = tree.nodes.new("ShaderNodeBump")
        bump.invert = True
        bump.inputs["Strength"].default_value = .42
        bump.inputs["Distance"].default_value = .007
        tree.links.new(tex.outputs["Distance"], bump.inputs["Height"])
        tree.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
        bsdf.inputs["Sheen Weight"].default_value = .37
        if properties["fabric"] == "open":
            transparent = tree.nodes.new("ShaderNodeBsdfTransparent")
            mask = tree.nodes.new("ShaderNodeMath")
            mask.operation = "GREATER_THAN"
            mask.inputs[1].default_value = .48
            mix = tree.nodes.new("ShaderNodeMixShader")
            tree.links.new(tex.outputs["Distance"], mask.inputs[0])
            tree.links.new(mask.outputs[0], mix.inputs[0])
            tree.links.new(bsdf.outputs[0], mix.inputs[1])
            tree.links.new(transparent.outputs[0], mix.inputs[2])
            tree.links.new(mix.outputs[0], tree.nodes.get("Material Output").inputs[0])
    materials[name] = m
    return m

# Geometry and world matrices come directly from the live procedural model.
# Object-level slots let finishes share the same cached mesh.
for shot in data["shots"]:
    if filter_names and shot["name"] not in filter_names:
        continue
    objects = []
    for item in shot["meshes"]:
        geo = geometry(item["id"])
        m = material(item["properties"])
        if not geo.materials:
            geo.materials.append(m)
        obj = bpy.data.objects.new("AirPods Max", geo)
        scene.collection.objects.link(obj)
        obj.material_slots[0].link = "OBJECT"
        obj.material_slots[0].material = m
        matrix = item["matrix"]
        obj.matrix_world = Matrix([matrix[r::4] for r in range(4)])
        objects.append(obj)
    target = Vector(shot["target"])
    distance = shot["distance"]
    cam.location = target + Vector((0, distance * .105, distance))
    # Three's product coordinate system is Y-up.
    backward = (cam.location - target).normalized()
    right = Vector((0, 1, 0)).cross(backward).normalized()
    up = backward.cross(right)
    cam.rotation_euler = Matrix((right, up, backward)).transposed().to_euler()
    key.location.x = -3.2 + 3.8 * math.sin(shot["progress"] * 8)
    aim(key, (0, 0, 0))
    scene.render.filepath = str(output / (shot["name"] + ".png"))
    bpy.ops.render.render(write_still=True)
    for obj in objects:
        bpy.data.objects.remove(obj, do_unlink=True)
