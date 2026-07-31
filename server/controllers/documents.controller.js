import prisma from "../lib/prisma.js";
import path from "path";
import { unlink } from "fs/promises";

export async function getDocuments(req, res) {
    try{
        const documents = await prisma.document.findMany({
            include:{
                jobs: true,
            },
            orderBy:{
                createdAt:"desc",
            },
        });
        return res.status(200).json(documents);
    }catch(error){
        console.error(error);
        return res.status(500).json({
            error: "unable to retrieve documents",
        });
    }
}


export async function createDocument(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "A document file is required",
        });
      }
  
      const document = await prisma.document.create({
        data: {
          name: req.body.name || req.file.originalname,
          originalName: req.file.originalname,
          fileUrl: `/uploads/${req.file.filename}`,
          mimeType: req.file.mimetype,
          size: req.file.size,
        },
      });
  
      return res.status(201).json(document);
    } catch (error) {
      console.error(error);
      if (req.file?.path){
        try{
          await unlink(req.file.path);
        }catch (fileError){
          console.error("Unable to clean up failed upload", fileError);
        }
      }
  
      return res.status(500).json({
        error: "Unable to upload document",
      });
    }
  }

// export async function  createDocument(req,res){
//     try{
//         const{
//             name,
//             originalName,
//             fileUrl,
//             mimeType,
//             size,
//         }=req.body;
//         if (!name || !originalName || !mimeType || size ===undefined){
//             return res.status(400).json({
//                 error:
//                 "name, originalNAme, fileUrl, mimeType, and size are required",
//             });
//         }
//         if (!Number.isInteger(size) || size <0){
//             return req.status(400).json({
//                 error : "size mnust be a non negative integer",
//             });
//         }
//         const document=await prisma.document.create({
//             data:{
//                 name,
//                 originalName,
//                 fileUrl,
//                 mimeType,
//                 size,
//             },
//         });
//         return res.status(201).json(document);
//     }catch(error){
//         console.error(error);
//         return res.status(500).json({
//             error:"Unable to create document",
//         });
//     }
// }

export async function attachDocumentToJob(req, res) {
    try{
        const documentId =Number(req.params.documentId);
        const jobId = Number(req.params.jobId);

        if (Number.isNaN(documentId) || Number.isNaN(jobId)){
            return res.status(400).json({
                error:"Invalid document or job ID",
            });
        }
        const document = await prisma.document.findUnique({
            where:{
                id:documentId,
            },
        });
        if (!document){
            return res.status(404).json({
                error:"Document not found",
            
        });
        }
        const job = await prisma.job.findUnique({
            where:{
                id : jobId,
            },
        });
        
        if(!job){
            return res.status(404).json({
                error:"Job not found",
            });
        } 
        const updatedDocument = await prisma.document.update({
            where:{
                id: documentId,
            },
            data:{
                jobs:{
                    connect:{
                        id:jobId,
                    },
                },
            },
            include:{
                jobs: true,
            },
        });
        return res.status(200).json(updatedDocument);
    }catch (error){
        console.error(error);
        return res.status(500).json({
            error: "Unable to attach document to job",
        });
    }
}


export async function detachDocumentFromJob(req, res) {
    try {
      const documentId = Number(req.params.documentId);
      const jobId = Number(req.params.jobId);
  
      if (Number.isNaN(documentId) || Number.isNaN(jobId)) {
        return res.status(400).json({
          error: "Invalid document or job ID",
        });
      }
  
      const document = await prisma.document.findUnique({
        where: {
          id: documentId,
        },
        include: {
          jobs: {
            where: {
              id: jobId,
            },
          },
        },
      });
  
      if (!document) {
        return res.status(404).json({
          error: "Document not found",
        });
      }
  
      if (document.jobs.length === 0) {
        return res.status(404).json({
          error: "Document is not attached to this job",
        });
      }
  
      const updatedDocument = await prisma.document.update({
        where: {
          id: documentId,
        },
        data: {
          jobs: {
            disconnect: {
              id: jobId,
            },
          },
        },
        include: {
          jobs: true,
        },
      });
  
      return res.status(200).json(updatedDocument);
    } catch (error) {
      console.error(error);
  
      return res.status(500).json({
        error: "Unable to detach document from job",
      });
    }
  }


  export async function getDocumentById(req, res) {
    try {
      const documentId = Number(req.params.id);
  
      if (Number.isNaN(documentId)) {
        return res.status(400).json({
          error: "Invalid document ID",
        });
      }
  
      const document = await prisma.document.findUnique({
        where: {
          id: documentId,
        },
        include: {
          jobs: true,
        },
      });
  
      if (!document) {
        return res.status(404).json({
          error: "Document not found",
        });
      }
  
      return res.status(200).json(document);
    } catch (error) {
      console.error(error);
  
      return res.status(500).json({
        error: "Unable to retrieve document",
      });
    }
  }


export async function deleteDocument(req, res) {
  try {
    const documentId = Number(req.params.id);
    if (Number.isNaN(documentId)){
      return res.status(400).json({
        error : "Invalid document Id",
      });
    }
    const document = await prisma.document.findUnique({
      where: {
        id: documentId,
      },
    });
    if (!document){
      return res.status(404).json({
        error : "Document not found",
      });
    }
    await prisma.document.delete({
      where : {
        id: documentId,
      },
    });
    
    const storedFileName = path.basename(document.fileUrl);
    const storedFilePath = path.join(
      process.cwd(),
      "uploads",
      storedFileName
    );

    try {
      await unlink(storedFilePath);
    }catch{
      if (FileSystemDirectoryReader.code !== "ENOENR"){
        console.error("Unable tot delete stored file:", fileError);
      }
    }
    return res.status(200).json({
      message: "Document deleted successfully"
    });
  }catch (error) {
    console.error(error);
    return res.status(500).json({
      error:"Unable to delete document",
    });
  }
}