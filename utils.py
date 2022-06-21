def send_png(img):
    img_io = io.BytesIO()
    img.save(img_io,'png',dpi=(int(300),int(300)))
    img_io.seek(0)
    return send_file(img_io,mimetype='image/png')

