The goal of this project is to make a program that will help with designing beadsprites. 

Problems that this is trying to solve:
    When looking at a pixel art image and trying to make a beadsprite out of it, it can be tricky to figure out which colors of beads that you have would look the best or most closely resemble the original image, which can lead to frustration.

Basic Idea:
    The user can save multiple project files (probably just jsons)
    When looking at an image, toggleable gridlines will be displayed in order to help the user count how long things are.
    You should be able to import a pixel art image, (not neccesarily a real pixel art image file, it could just be a screenshot with a white background.) And the program will automatically, or with user assistance, attempt to figure out what the actual pixels in the image are, and then store them in some internal representation.
    When looking at a parsed image, all of the distinct colors should be shown, and the user should be able to preview what the image would look like with one color substituted with another. 
    The user should be able to define which colors of beads that they own, and the colors in the image should be auto-mapped to those ones. Should be able to control exactly how this is done, how similar pixels should be in color to be considered the same, eg. 0xffffff and 0xfffffd are basically the same and they should be grouped together. 

    It would be nice to have a database of hex codes for all the perler beads, you might need to just find those online somewhere. 




