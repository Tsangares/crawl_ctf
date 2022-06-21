from shapely.geometry import Point, LineString
from shapely.geometry.polygon import Polygon
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import os,random,statistics,json,csv,time,math
from PIL import Image,ImageDraw

#Defines a image, draws a polygon and returns verticies
def get_setup(sides,width):
    #Define image
    img = Image.new('RGBA',(width,width),'white')
    draw = ImageDraw.Draw(img)

    #Get polygon
    get_polygon = ImageDraw._compute_regular_polygon_vertices
    poly_points = get_polygon((width/2,width/2,width/2),sides,0)


    #Draw
    draw.polygon(poly_points,outline="black")

    #Convert to numpy
    poly_points = [np.array(p) for p in poly_points]

    return poly_points,img

#Draws pretty shape
def build_shape(sides=5,division=1/2,width=500,n_points=100_000,start=None,showImg=False):
    #Get starting image and polygon
    poly_points,img = get_setup(sides,width)
    if showImg:
        draw = ImageDraw.Draw(img)

    #Get starting condition
    if start is None:
        polygon = Polygon(poly_points)
        gen_point = lambda: (random.randint(0,width),random.randint(0,width))
        start = gen_point()
        while not polygon.contains(Point(start)):
            start = gen_point()
    point = start

    #Begin drawing
    points = [point]
    point = np.array(point)
    q = division
    for _ in range(n_points):
        p = random.choice(poly_points)
        point = (q*p+(1-q)*point)
        points.append(tuple(point))
    if showImg: 
        draw.point(points,fill="blue")
        return img
    else:
        return points

def get_poly_points(sides):
    return build_shape(sides=sides)

def get_rationals():
    rationals = []
    for i in range(2,100):
        for j in range(1,i):
            rationals.append(j/i)
    return rationals


def get_page(resolution=1_000,squares=4,points=50_000,split=None,poly=None):
    resolution = 1_000
    rationals=[1/2,2/3,1/4]
    page = Image.new('RGBA',(resolution*squares,resolution*squares),'white')
    for i in range(squares):
        for j in range(squares):
            if split is None:
                #q = random.choice(rationals)
                q = random.random()*.5 + .5
            else:
                q = split
            if poly is None:
                sides = random.randint(3,12)
            else:
                sides=poly
            img = build_shape(sides=sides,division=q,width=resolution,n_points=points)
            page.paste(img,(resolution*i,resolution*j))
    return page

run=get_page

if __name__=="__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Make fractle art.")
    parser.add_argument('--resolution','-r', type=int, help="Pixels width and height per graphic.",default=600)
    parser.add_argument('--poly','-p', type=int, help="The number of sides to a polygon",default=None)
    parser.add_argument('--points','-n', type=int, help="Number of points in the image.",default=50_000)
    parser.add_argument('--squares','-g', type=int, help="Number of graphics to create in grid. n*n",default=4)
    parser.add_argument('--split','-s', type=float, help="Splitting point for diving a line.",default=None)
    args = parser.parse_args()
    page = get_page(resolution=args.resolution,poly=args.poly,points=args.points,squares=args.squares,split=args.split)
    page.show()
