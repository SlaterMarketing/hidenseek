import { FormEvent, useState, useEffect, useRef } from "react";
    import { useMutation, useAction } from "convex/react";
    import { api } from "../convex/_generated/api";
    import { Doc, Id } from "../convex/_generated/dataModel";
    import { toast } from "sonner";

    interface EditGameSessionFormProps {
      session: Doc<"game_sessions"> & { imageUrl?: string | null };
      onSessionUpdated: () => void;
      onCancel: () => void;
    }

    export function EditGameSessionForm({ session, onSessionUpdated, onCancel }: EditGameSessionFormProps) {
      const updateSessionMutation = useMutation(api.gameSessions.updateGameSession);
      const generateUploadUrl = useAction(api.files.actionGenerateUploadUrl);

      const [title, setTitle] = useState(session.title);
      const [description, setDescription] = useState(session.description || "");
      const [locationCity, setLocationCity] = useState(session.locationCity);
      const [locationRegion, setLocationRegion] = useState(session.locationRegion);
      const [locationCountry, setLocationCountry] = useState(session.locationCountry);
      const [meetingPoint, setMeetingPoint] = useState(session.meetingPoint || "");

      const initialScheduledDate = new Date(session.scheduledTimestamp);
      const [scheduledDate, setScheduledDate] = useState(initialScheduledDate.toISOString().split('T')[0]);
      const [scheduledTime, setScheduledTime] = useState(initialScheduledDate.toTimeString().substring(0,5));

      const [durationHours, setDurationHours] = useState(session.durationHours);
      const [maxPlayers, setMaxPlayers] = useState<number | undefined>(session.maxPlayers);
      const [difficultyLevel, setDifficultyLevel] = useState<"" | "beginner" | "intermediate" | "advanced" | undefined>(session.difficultyLevel || "");
      const [specialRules, setSpecialRules] = useState(session.specialRules || "");

      const [imageFile, setImageFile] = useState<File | null>(null);
      const [imagePreview, setImagePreview] = useState<string | null>(session.imageUrl || null);
      const [removeCurrentImage, setRemoveCurrentImage] = useState(false);
      const imageInputRef = useRef<HTMLInputElement>(null);


      const [isSubmitting, setIsSubmitting] = useState(false);

      useEffect(() => {
        setTitle(session.title);
        setDescription(session.description || "");
        setLocationCity(session.locationCity);
        setLocationRegion(session.locationRegion);
        setLocationCountry(session.locationCountry);
        setMeetingPoint(session.meetingPoint || "");
        const newScheduledDate = new Date(session.scheduledTimestamp);
        setScheduledDate(newScheduledDate.toISOString().split('T')[0]);
        setScheduledTime(newScheduledDate.toTimeString().substring(0,5));
        setDurationHours(session.durationHours);
        setMaxPlayers(session.maxPlayers);
        setDifficultyLevel(session.difficultyLevel || "");
        setSpecialRules(session.specialRules || "");
        setImagePreview(session.imageUrl || null);
        setImageFile(null);
        setRemoveCurrentImage(false);
        if(imageInputRef.current) imageInputRef.current.value = "";
      }, [session]);

      const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
          setImageFile(file);
          setRemoveCurrentImage(false);
          const reader = new FileReader();
          reader.onloadend = () => {
            setImagePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      };

      const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setRemoveCurrentImage(true);
        if(imageInputRef.current) imageInputRef.current.value = "";
      };

      const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!scheduledDate || !scheduledTime) {
          toast.error("Please select a valid date and time for the session.");
          return;
        }
         if (maxPlayers === undefined || maxPlayers <= 0) {
          toast.error("Max players must be a positive number.");
          return;
        }

        const scheduledTimestamp = new Date(`${scheduledDate}T${scheduledTime}`).getTime();
         if (scheduledTimestamp <= Date.now() && session.scheduledTimestamp !== scheduledTimestamp) {
          toast.error("Scheduled date and time must be in the future.");
          return;
        }

        setIsSubmitting(true);
        try {
          let imageIdToUpdate: Id<"_storage"> | undefined | null = session.imageId;

          if (removeCurrentImage) {
            imageIdToUpdate = null;
          } else if (imageFile) {
            const uploadUrl = await generateUploadUrl();
            const uploadResponse = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": imageFile.type },
              body: imageFile,
            });
            const uploadJson = await uploadResponse.json();
            if (!uploadResponse.ok) {
              throw new Error(`Image upload failed: ${JSON.stringify(uploadJson)}`);
            }
            imageIdToUpdate = uploadJson.storageId;
          }


          await updateSessionMutation({
            sessionId: session._id,
            title,
            description: description || undefined,
            locationCity,
            locationRegion,
            locationCountry,
            meetingPoint: meetingPoint || undefined,
            scheduledTimestamp,
            durationHours: durationHours || undefined,
            maxPlayers,
            difficultyLevel: difficultyLevel === "" ? undefined : difficultyLevel,
            specialRules: specialRules || undefined,
            imageId: imageIdToUpdate === null ? undefined : imageIdToUpdate,
          });
          toast.success("Game session updated successfully!");
          onSessionUpdated();
        } catch (error: any) {
          toast.error(`Failed to update session: ${error.message || error.toString()}`);
        } finally {
          setIsSubmitting(false);
        }
      };

      return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 shadow-lg rounded-lg max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-semibold text-primary text-center">Edit Game Session</h2>

          <div>
            <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700">Title*</label>
            <input id="edit-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 input-base" />
          </div>

          <div>
            <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 input-base" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="edit-locationCity" className="block text-sm font-medium text-gray-700">City*</label>
              <input id="edit-locationCity" type="text" value={locationCity} onChange={(e) => setLocationCity(e.target.value)} required className="mt-1 input-base" />
            </div>
            <div>
              <label htmlFor="edit-locationRegion" className="block text-sm font-medium text-gray-700">State/Region*</label>
              <input id="edit-locationRegion" type="text" value={locationRegion} onChange={(e) => setLocationRegion(e.target.value)} required className="mt-1 input-base" />
            </div>
            <div>
              <label htmlFor="edit-locationCountry" className="block text-sm font-medium text-gray-700">Country*</label>
              <input id="edit-locationCountry" type="text" value={locationCountry} onChange={(e) => setLocationCountry(e.target.value)} required className="mt-1 input-base" />
            </div>
          </div>

          <div>
            <label htmlFor="edit-meetingPoint" className="block text-sm font-medium text-gray-700">Meeting Point Details</label>
            <input id="edit-meetingPoint" type="text" value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} className="mt-1 input-base" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-scheduledDate" className="block text-sm font-medium text-gray-700">Date*</label>
              <input id="edit-scheduledDate" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required className="mt-1 input-base" />
            </div>
            <div>
              <label htmlFor="edit-scheduledTime" className="block text-sm font-medium text-gray-700">Time*</label>
              <input id="edit-scheduledTime" type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} required className="mt-1 input-base" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-durationHours" className="block text-sm font-medium text-gray-700">Duration (Hours)</label>
              <input id="edit-durationHours" type="number" value={durationHours === undefined ? "" : durationHours} onChange={(e) => setDurationHours(e.target.value === "" ? undefined : parseFloat(e.target.value))} min="0.5" step="0.5" className="mt-1 input-base" />
            </div>
            <div>
              <label htmlFor="edit-maxPlayers" className="block text-sm font-medium text-gray-700">Max Players*</label>
              <input
                id="edit-maxPlayers"
                type="number"
                value={maxPlayers === undefined ? "" : maxPlayers}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || val === null) {
                    setMaxPlayers(undefined);
                  } else {
                    const num = parseInt(val, 10);
                    setMaxPlayers(isNaN(num) ? undefined : num);
                  }
                }}
                required
                min="1"
                className="mt-1 input-base" />
            </div>
          </div>

          <div>
            <label htmlFor="edit-difficultyLevel" className="block text-sm font-medium text-gray-700">Difficulty Level</label>
            <select id="edit-difficultyLevel" value={difficultyLevel} onChange={(e) => setDifficultyLevel(e.target.value as any)} className="mt-1 input-base">
              <option value="">Any</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label htmlFor="edit-specialRules" className="block text-sm font-medium text-gray-700">Special Rules/Notes</label>
            <textarea id="edit-specialRules" value={specialRules} onChange={(e) => setSpecialRules(e.target.value)} rows={2} className="mt-1 input-base" />
          </div>

          <div>
            <label htmlFor="edit-sessionImage" className="block text-sm font-medium text-gray-700">Session Image</label>
            <input id="edit-sessionImage" type="file" accept="image/*" ref={imageInputRef} onChange={handleImageChange} className="mt-1 file-input" />
            {imagePreview && (
              <div className="mt-2">
                <img src={imagePreview} alt="Session preview" className="max-h-40 rounded" />
                <button type="button" onClick={handleRemoveImage} className="text-red-500 hover:underline text-sm mt-1">Remove Image</button>
              </div>
            )}
            {!imagePreview && session.imageId && !removeCurrentImage && <p className="text-xs text-gray-500 mt-1">Current image will be kept unless a new one is uploaded or explicitly removed.</p>}
          </div>


          <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white py-4">
            <button type="button" onClick={onCancel} className="btn btn-outline" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Session"}
            </button>
          </div>
        </form>
      );
    }
