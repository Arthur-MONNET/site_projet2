from stl_tools import numpy2stl
from scipy.ndimage import gaussian_filter
from scipy.misc import imread

A = imread("uploads_image/cristallized-1651666969296.jpg")
A = A[:,:,2] + 1.0*A[:,:,0] # Compose elements from RGBA channels to give depth 
A = gaussian_filter(A, 1) # smoothing

numpy2stl(A, "cristallized-1651666969296.stl", scale=0.05, mask_val = 5.)